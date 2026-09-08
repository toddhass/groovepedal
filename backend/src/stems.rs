use axum::{
    body::Body,
    extract::{Multipart, Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use dashmap::DashMap;
use serde::Serialize;
use std::{path::PathBuf, sync::Arc};
use tokio::{fs, io::AsyncWriteExt, process::Command};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Queued,
    Running,
    Done,
    Error,
}

#[derive(Debug, Clone, Serialize)]
pub struct StemJob {
    pub id: String,
    pub status: JobStatus,
    #[serde(rename = "vocalsUrl", skip_serializing_if = "Option::is_none")]
    pub vocals_url: Option<String>,
    #[serde(rename = "instrumentalUrl", skip_serializing_if = "Option::is_none")]
    pub instrumental_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Job table, keyed by job id. Mirrors the ChannelWorker/DashMap actor
/// pattern used for HLS channels: each job is owned by one background task
/// that updates its own entry, readers just poll the map.
pub type JobStore = Arc<DashMap<Uuid, StemJob>>;

pub fn work_dir() -> PathBuf {
    std::env::temp_dir().join("groovepedal-stems")
}

pub async fn submit(
    State(jobs): State<JobStore>,
    mut multipart: Multipart,
) -> Result<Json<StemJob>, (StatusCode, String)> {
    let id = Uuid::new_v4();
    let job_dir = work_dir().join(id.to_string());
    fs::create_dir_all(&job_dir)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut input_path: Option<PathBuf> = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        if field.name() == Some("file") {
            let filename = field.file_name().unwrap_or("input").to_string();
            let ext = filename.rsplit('.').next().unwrap_or("bin");
            let path = job_dir.join(format!("input.{ext}"));
            let data = field
                .bytes()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            let mut f = fs::File::create(&path)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            f.write_all(&data)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            input_path = Some(path);
        }
    }

    let input_path = input_path.ok_or((StatusCode::BAD_REQUEST, "missing file field".into()))?;

    let job = StemJob {
        id: id.to_string(),
        status: JobStatus::Queued,
        vocals_url: None,
        instrumental_url: None,
        error: None,
    };
    jobs.insert(id, job.clone());

    tokio::spawn(run_separation(jobs.clone(), id, job_dir, input_path));

    Ok(Json(job))
}

/// Runs Demucs (`pip install demucs`, needs ffmpeg on PATH) as a subprocess,
/// same shape as the ffmpeg-via-tokio::process management in the IPTV
/// server. `--two-stems=vocals` gives a real ML-separated vocals.wav /
/// no_vocals.wav pair instead of the frontend's mid-side approximation.
async fn run_separation(jobs: JobStore, id: Uuid, job_dir: PathBuf, input_path: PathBuf) {
    if let Some(mut entry) = jobs.get_mut(&id) {
        entry.status = JobStatus::Running;
    }

    let output_dir = job_dir.join("output");
    let status = Command::new("demucs")
        .arg("--two-stems=vocals")
        .arg("-o")
        .arg(&output_dir)
        .arg(&input_path)
        .status()
        .await;

    let stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("input")
        .to_string();

    match status {
        Ok(s) if s.success() => {
            // demucs writes <output>/<model>/<stem>/{vocals,no_vocals}.wav
            let model_dir = match find_model_dir(&output_dir).await {
                Some(d) => d,
                None => {
                    fail(&jobs, id, "demucs finished but output was not found").await;
                    return;
                }
            };
            let track_dir = model_dir.join(&stem);
            let vocals = track_dir.join("vocals.wav");
            let instrumental = track_dir.join("no_vocals.wav");
            if vocals.exists() && instrumental.exists() {
                if let Some(mut entry) = jobs.get_mut(&id) {
                    entry.status = JobStatus::Done;
                    entry.vocals_url = Some(format!("/api/stems/{id}/vocals.wav"));
                    entry.instrumental_url = Some(format!("/api/stems/{id}/instrumental.wav"));
                }
            } else {
                fail(&jobs, id, "demucs finished but stem files were missing").await;
            }
        }
        Ok(s) => {
            fail(&jobs, id, &format!("demucs exited with status {s}")).await;
        }
        Err(e) => {
            fail(
                &jobs,
                id,
                &format!("could not launch demucs (is it installed and on PATH?): {e}"),
            )
            .await;
        }
    }
}

async fn find_model_dir(output_dir: &PathBuf) -> Option<PathBuf> {
    let mut entries = fs::read_dir(output_dir).await.ok()?;
    entries.next_entry().await.ok().flatten().map(|e| e.path())
}

async fn fail(jobs: &JobStore, id: Uuid, msg: &str) {
    tracing::warn!("stem job {id} failed: {msg}");
    if let Some(mut entry) = jobs.get_mut(&id) {
        entry.status = JobStatus::Error;
        entry.error = Some(msg.to_string());
    }
}

pub async fn status(
    State(jobs): State<JobStore>,
    Path(id): Path<Uuid>,
) -> Result<Json<StemJob>, StatusCode> {
    jobs.get(&id)
        .map(|j| Json(j.clone()))
        .ok_or(StatusCode::NOT_FOUND)
}

pub async fn fetch_stem(
    State(jobs): State<JobStore>,
    Path((id, name)): Path<(Uuid, String)>,
) -> Response {
    let job = match jobs.get(&id) {
        Some(j) => j.clone(),
        None => return StatusCode::NOT_FOUND.into_response(),
    };
    if job.status != JobStatus::Done {
        return StatusCode::CONFLICT.into_response();
    }

    let filename = match name.as_str() {
        "vocals.wav" => "vocals.wav",
        "instrumental.wav" => "no_vocals.wav",
        _ => return StatusCode::NOT_FOUND.into_response(),
    };

    let output_dir = work_dir().join(id.to_string()).join("output");
    let model_dir = match find_model_dir(&output_dir).await {
        Some(d) => d,
        None => return StatusCode::NOT_FOUND.into_response(),
    };
    // job dir has exactly one track subdirectory (one file per job)
    let mut track_entries = match fs::read_dir(&model_dir).await {
        Ok(e) => e,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };
    let track_dir = match track_entries.next_entry().await {
        Ok(Some(e)) => e.path(),
        _ => return StatusCode::NOT_FOUND.into_response(),
    };

    let path = track_dir.join(filename);
    match fs::read(&path).await {
        Ok(bytes) => Response::builder()
            .header(header::CONTENT_TYPE, "audio/wav")
            .body(Body::from(bytes))
            .unwrap(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}
