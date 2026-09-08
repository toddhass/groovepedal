mod apple;
mod stems;

use axum::{
    routing::{get, post},
    Router,
};
use dashmap::DashMap;
use std::sync::Arc;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    let jobs: stems::JobStore = Arc::new(DashMap::new());
    tokio::fs::create_dir_all(stems::work_dir()).await.ok();

    let app = Router::new()
        .route("/api/health", get(|| async { "ok" }))
        .route("/api/apple-search", get(apple::search))
        .route("/api/stems", post(stems::submit))
        .route("/api/stems/:id", get(stems::status))
        .route("/api/stems/:id/:name", get(stems::fetch_stem))
        .with_state(jobs)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8787").await?;
    tracing::info!("groovepedal-backend listening on :8787");
    axum::serve(listener, app).await?;
    Ok(())
}
