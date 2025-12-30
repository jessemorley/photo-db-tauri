use std::fs;
use std::path::Path;
use serde::{Serialize, Deserialize};

pub const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff"];

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Photographer {
    pub name: String,
    pub path: String,
    pub preview_image: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ImageFile {
    pub name: String,
    pub path: String,
}

pub fn is_image_file(path: &Path) -> bool {
    if let Some(ext) = path.extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        IMAGE_EXTENSIONS.contains(&ext_str.as_str())
    } else {
        false
    }
}

pub fn get_preview_image(dir: &Path) -> Option<String> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    let path = entry.path();
                    if is_image_file(&path) {
                        return Some(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    None
}

pub fn discover_photographers(root: &str) -> Result<Vec<Photographer>, std::io::Error> {
    let path = Path::new(root);
    let entries = fs::read_dir(path)?;

    let mut photographers = Vec::new();

    for entry in entries.flatten() {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                let path_str = entry.path().to_string_lossy().to_string();
                let preview = get_preview_image(&entry.path());

                photographers.push(Photographer {
                    name,
                    path: path_str,
                    preview_image: preview,
                });
            }
        }
    }

    Ok(photographers)
}

pub fn get_images(folder: &str) -> Result<Vec<ImageFile>, std::io::Error> {
    let path = Path::new(folder);
    let entries = fs::read_dir(path)?;

    let mut images = Vec::new();

    for entry in entries.flatten() {
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                let entry_path = entry.path();
                if is_image_file(&entry_path) {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let path_str = entry_path.to_string_lossy().to_string();

                    images.push(ImageFile {
                        name,
                        path: path_str,
                    });
                }
            }
        }
    }

    Ok(images)
}
