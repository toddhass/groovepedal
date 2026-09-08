use axum::{extract::Query, Json};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct SearchParams {
    pub term: String,
}

#[derive(Debug, Deserialize)]
struct ITunesResponse {
    results: Vec<ITunesTrack>,
}

#[derive(Debug, Deserialize)]
struct ITunesTrack {
    #[serde(rename = "trackId")]
    track_id: Option<i64>,
    #[serde(rename = "trackName")]
    track_name: Option<String>,
    #[serde(rename = "artistName")]
    artist_name: Option<String>,
    #[serde(rename = "previewUrl")]
    preview_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AppleHit {
    #[serde(rename = "trackId")]
    pub track_id: i64,
    #[serde(rename = "trackName")]
    pub track_name: String,
    #[serde(rename = "artistName")]
    pub artist_name: String,
    #[serde(rename = "previewUrl")]
    pub preview_url: String,
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<AppleHit>,
}

/// Proxies the public iTunes Search API. Kept server-side so the frontend
/// doesn't have to deal with iTunes' CORS/rate-limit behavior directly, and
/// so a future switch to authenticated MusicKit calls doesn't touch the
/// client at all.
pub async fn search(Query(params): Query<SearchParams>) -> Json<SearchResponse> {
    let client = reqwest::Client::new();
    let url = "https://itunes.apple.com/search";

    let resp = client
        .get(url)
        .query(&[
            ("term", params.term.as_str()),
            ("media", "music"),
            ("limit", "10"),
        ])
        .send()
        .await;

    let hits = match resp {
        Ok(r) => match r.json::<ITunesResponse>().await {
            Ok(parsed) => parsed
                .results
                .into_iter()
                .filter_map(|t| {
                    Some(AppleHit {
                        track_id: t.track_id?,
                        track_name: t.track_name.unwrap_or_default(),
                        artist_name: t.artist_name.unwrap_or_default(),
                        preview_url: t.preview_url?,
                    })
                })
                .collect(),
            Err(e) => {
                tracing::warn!("failed to parse iTunes response: {e}");
                vec![]
            }
        },
        Err(e) => {
            tracing::warn!("iTunes search request failed: {e}");
            vec![]
        }
    };

    Json(SearchResponse { results: hits })
}
