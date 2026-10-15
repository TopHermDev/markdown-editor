#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::sync::Mutex;
use serde::Serialize;

#[derive(Serialize)]
struct DirEntry {
    name: String,
    is_dir: bool,
    path: String,
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result: Vec<DirEntry> = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();

        // Skip hidden files/directories (names starting with '.')
        if name.starts_with('.') {
            continue;
        }

        result.push(DirEntry {
            name,
            is_dir: metadata.is_dir(),
            path: full_path,
        });
    }

    // Sort: directories first, then alphabetically
    result.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(result)
}

// File path passed on the command line (OS file association / "Open with").
// Stored in managed state so the frontend can PULL it once its JS is ready.
// The old approach PUSHed an 'open-file' event during setup(), which fired
// before the webview had loaded app.js and registered its listener, so the
// event was lost and the window came up empty.
struct PendingOpenFile(Mutex<Option<String>>);

#[tauri::command]
fn take_pending_open_file(state: tauri::State<PendingOpenFile>) -> Option<String> {
    state.0.lock().unwrap().take()
}

fn main() {
    let pending: Mutex<Option<String>> = Mutex::new(None);

    {
        let args: Vec<String> = env::args().collect();
        let file_args: Vec<&str> = args
            .iter()
            .skip(1)
            .filter(|arg| !arg.starts_with('-'))
            .map(|s| s.as_str())
            .collect();

        if !file_args.is_empty() {
            *pending.lock().unwrap() = Some(file_args[0].to_string());
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PendingOpenFile(pending))
        .invoke_handler(tauri::generate_handler![read_file, write_file, list_directory, take_pending_open_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
