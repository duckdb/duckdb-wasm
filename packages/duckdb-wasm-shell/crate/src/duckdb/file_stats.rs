use crate::utils::pretty_bytes;
use crate::vt100;
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;

const BLOCK_CHARS: [char; 4] = ['░', '▒', '▓', '█'];

#[wasm_bindgen(module = "@duckdb/duckdb-wasm")]
extern "C" {
    #[wasm_bindgen(js_name = "FileStatistics")]
    pub type JsFileStatistics;

    #[wasm_bindgen(method, getter, js_name = "totalFileWrites")]
    fn get_total_file_writes(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "totalFileReadsCold")]
    fn get_total_file_reads_cold(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "totalFileReadsAhead")]
    fn get_total_file_reads_ahead(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "totalFileReadsCached")]
    fn get_total_file_reads_cached(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "totalPageWrites")]
    fn get_total_page_writes(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "totalPageReads")]
    fn get_total_page_reads(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "blockSize")]
    fn get_block_size(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "blockStats")]
    fn get_block_stats(this: &JsFileStatistics) -> JsValue;
}

pub struct FileStatistics {
    pub total_file_reads_cold: u64,
    pub total_file_reads_ahead: u64,
    pub total_file_reads_cached: u64,
    pub total_file_writes: u64,
    pub total_page_reads: u64,
    pub total_page_writes: u64,
    pub block_size: u64,
    pub block_stats: Vec<u8>,
}

pub struct FileBlockStatistics {
    pub file_reads_cold: u8,
    pub file_reads_ahead: u8,
    pub file_reads_cached: u8,
    pub file_writes: u8,
    pub page_reads: u8,
    pub page_writes: u8,
}

impl FileStatistics {
    pub fn read(stats: &JsFileStatistics) -> Self {
        let u8array: Uint8Array = stats.get_block_stats().into();
        Self {
            total_file_writes: stats.get_total_file_writes().as_f64().unwrap_or(0.0) as u64,
            total_file_reads_ahead: stats.get_total_file_reads_ahead().as_f64().unwrap_or(0.0)
                as u64,
            total_file_reads_cold: stats.get_total_file_reads_cold().as_f64().unwrap_or(0.0) as u64,
            total_file_reads_cached: stats.get_total_file_reads_cached().as_f64().unwrap_or(0.0)
                as u64,
            total_page_writes: stats.get_total_page_writes().as_f64().unwrap_or(0.0) as u64,
            total_page_reads: stats.get_total_page_reads().as_f64().unwrap_or(0.0) as u64,
            block_size: stats.get_block_size().as_f64().unwrap_or(0.0) as u64,
            block_stats: u8array.to_vec(),
        }
    }

    pub fn get_block_count(&self) -> usize {
        self.block_stats.len() / 3
    }

    pub fn get_block_stats(&self, idx: usize) -> FileBlockStatistics {
        FileBlockStatistics {
            file_writes: self.block_stats[3 * idx + 0] & 0b1111,
            file_reads_cold: self.block_stats[3 * idx + 0] >> 4,
            file_reads_ahead: self.block_stats[3 * idx + 1] & 0b1111,
            file_reads_cached: self.block_stats[3 * idx + 1] >> 4,
            page_reads: self.block_stats[3 * idx + 2] & 0b1111,
            page_writes: self.block_stats[3 * idx + 2] >> 4,
        }
    }

    pub fn print_read_stats(&self, width: usize) -> String {
        // Determine the maximum value per attribute to scale the block chars
        let mut max = 0;
        let block_count = self.get_block_count();
        for i in 0..block_count {
            let b = self.get_block_stats(i);
            max = max.max(b.file_reads_cold);
            max = max.max(b.file_reads_ahead);
            max = max.max(b.file_reads_cached);
        }

        // Collect all block chars
        let mut block_chars: Vec<char> = Vec::new();
        block_chars.resize(3 * block_count, '\0');
        for i in 0..block_count {
            let stats = self.get_block_stats(i);
            block_chars[3 * i + 0] = if stats.file_reads_cold > 0 {
                BLOCK_CHARS[(stats.file_reads_cold * 4 / max).min(3) as usize]
            } else {
                ' '
            };
            block_chars[3 * i + 1] = if stats.file_reads_ahead > 0 {
                BLOCK_CHARS[(stats.file_reads_ahead * 4 / max).min(3) as usize]
            } else {
                ' '
            };
            block_chars[3 * i + 2] = if stats.file_reads_cached > 0 {
                BLOCK_CHARS[(stats.file_reads_cached * 4 / max).min(3) as usize]
            } else {
                ' '
            };
        }
        let column_width = ((width.max(4) - 4) / 3).max(1);
        let row_count = (block_count + column_width - 1) / column_width;

        // Write all block chars
        let mut out = String::new();
        out.reserve((6 * 5 + 3 * column_width) * (row_count + 4));
        out.push('┌');
        out.push_str(&"─".repeat(column_width));
        out.push('┬');
        out.push_str(&"─".repeat(column_width));
        out.push('┬');
        out.push_str(&"─".repeat(column_width));
        out.push('┐');
        out.push_str("\r\n");
        for row in 0..row_count {
            let range = (row * column_width)..((row + 1) * column_width).min(block_count);
            let padding = column_width - range.len();
            out.push_str(vt100::COLOR_FG_WHITE);
            out.push('│');
            out.push_str(vt100::COLOR_FG_BRIGHT_YELLOW);
            for i in range.clone() {
                out.push(block_chars[3 * i + 0]);
            }
            out.push_str(&" ".repeat(padding));
            out.push_str(vt100::COLOR_FG_WHITE);
            out.push('│');
            out.push_str(vt100::COLOR_FG_BRIGHT_YELLOW);
            for i in range.clone() {
                out.push(block_chars[3 * i + 1]);
            }
            out.push_str(&" ".repeat(padding));
            out.push_str(vt100::COLOR_FG_WHITE);
            out.push('│');
            out.push_str(vt100::COLOR_FG_BRIGHT_YELLOW);
            for i in range.clone() {
                out.push(block_chars[3 * i + 2]);
            }
            out.push_str(&" ".repeat(padding));
            out.push_str(vt100::COLOR_FG_WHITE);
            out.push_str("│\r\n");
        }
        out.push('└');
        out.push_str(&"─".repeat(column_width));
        out.push('┴');
        out.push_str(&"─".repeat(column_width));
        out.push('┴');
        out.push_str(&"─".repeat(column_width));
        out.push('┘');
        out.push_str("\r\n");

        let write_col = |out: &mut String, s: &str, w: usize| {
            out.push_str(s);
            out.push_str(&" ".repeat(w.max(s.len()) - s.len()));
        };

        out.push_str(vt100::MODE_BOLD);
        write_col(&mut out, " Cold", column_width + 1);
        write_col(&mut out, " Read-Ahead", column_width + 1);
        write_col(&mut out, " Cached", column_width + 1);
        out.push_str(vt100::MODES_OFF);
        out.push_str("\r\n");

        write_col(
            &mut out,
            &format!(" {}", pretty_bytes(self.total_file_reads_cold as f64)),
            column_width + 1,
        );
        write_col(
            &mut out,
            &format!(" {}", pretty_bytes(self.total_file_reads_ahead as f64)),
            column_width + 1,
        );
        write_col(
            &mut out,
            &format!(" {}", pretty_bytes(self.total_file_reads_cached as f64)),
            column_width + 1,
        );
        out.push_str("\r\n");
        out.push_str("\r\n");

        out.push_str(&format!(
            "{bold}Block Size:{normal} {bytes}\r\n",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF,
            bytes = pretty_bytes(self.block_size as f64)
        ));
        out.push_str(&format!(
            "{bold}Block Hits:{normal}",
            bold = vt100::MODE_BOLD,
            normal = vt100::MODES_OFF
        ));
        for i in 0..4 {
            let v = 1 + (i * max / 4);
            out.push_str(&format!(
                " {fg}{sym}{normal} >={hits}",
                sym = BLOCK_CHARS[i as usize],
                hits = (1 << v) - 1,
                fg = vt100::COLOR_FG_BRIGHT_YELLOW,
                normal = vt100::MODES_OFF,
            ));
        }
        out
    }
}
