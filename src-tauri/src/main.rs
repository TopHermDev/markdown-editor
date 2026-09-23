#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use serde::Serialize;
use tauri::Emitter;
use tauri::Manager;

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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_file, write_file, list_directory])
        .setup(|app| {
            let args: Vec<String> = env::args().collect();
            let file_args: Vec<&str> = args
                .iter()
                .skip(1)
                .filter(|arg| !arg.starts_with('-'))
                .map(|s| s.as_str())
                .collect();

            if !file_args.is_empty() {
                let file_path = file_args[0].to_string();
                let window = app.get_webview_window("main").unwrap();
                window.emit("open-file", file_path).unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
