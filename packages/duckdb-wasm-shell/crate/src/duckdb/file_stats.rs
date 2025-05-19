use crate::utils::pretty_bytes;
use crate::vt100;
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;

const BLOCK_CHARS: [char; 4] = ['░', '▒', '▓', '█'];

#[wasm_bindgen(module = "@motherduck/duckdb-wasm")]
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
    #[wasm_bindgen(method, getter, js_name = "totalPageAccesses")]
    fn get_total_page_accesses(this: &JsFileStatistics) -> JsValue;
    #[wasm_bindgen(method, getter, js_name = "totalPageLoads")]
    fn get_total_page_loads(this: &JsFileStatistics) -> JsValue;
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
    pub total_page_accesses: u64,
    pub total_page_loads: u64,
    pub block_size: u64,
    pub block_stats: Vec<u8>,
}

pub struct FileBlockStatistics {
    pub file_reads_cold: u8,
    pub file_reads_ahead: u8,
    pub file_reads_cached: u8,
    pub file_writes: u8,
    pub page_accesses: u8,
    pub page_loads: u8,
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
            total_page_accesses: stats.get_total_page_accesses().as_f64().unwrap_or(0.0) as u64,
            total_page_loads: stats.get_total_page_loads().as_f64().unwrap_or(0.0) as u64,
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
            page_accesses: self.block_stats[3 * idx + 2] & 0b1111,
            page_loads: self.block_stats[3 * idx + 2] >> 4,
        }
    }

    fn print_block_stats(
        out: &mut String,
        terminal_width: usize,
        column_names: &[&str],
        column_totals: &[u64],
        blocks: &[char],
        block_size: u64,
        _max_hits: u8,
    ) {
        let column_count = column_names.len();
        let column_border_count = column_count + 1;
        let column_width =
            ((terminal_width.max(column_border_count) - column_border_count) / column_count).max(1);

        // Draw legend
        let mut legend = String::new();
        let block_bytes = pretty_bytes(block_size as f64);
        legend.push_str(&format!(
            "{fg}{sym}{normal} {bytes}   ",
            sym = BLOCK_CHARS[3],
            fg = vt100::COLOR_FG_WHITE,
            normal = vt100::MODES_OFF,
            bytes = block_bytes
        ));
        let legend_width = 1 + 1 + block_bytes.len() + 3;
        // for i in 0..4 {
        //     let v = i * max_hits / 4;
        //     let hits = (1 << v) - 1;
        //     let hits_fmt = format!("{}", hits);
        //     legend.push_str(&format!(
        //         " {fg}{sym}{normal} > {hits}",
        //         sym = BLOCK_CHARS[i as usize],
        //         hits = &hits_fmt,
        //         fg = vt100::COLOR_FG_BRIGHT_YELLOW,
        //         normal = vt100::MODES_OFF,
        //     ));
        //     legend_width += 1 + 1 + 3 + hits_fmt.len();
        // }
        // legend_width += 2;
        out.push_str(&" ".repeat(terminal_width.max(legend_width) - legend_width));
        out.push_str(&legend);
        out.push_str("\r\n");

        // Draw header
        out.push('┌');
        for i in 0..column_count {
            if i != 0 {
                out.push('┬');
            }
            out.push_str(&"─".repeat(column_width));
        }
        out.push_str("┐\r\n");

        // Draw rows
        let block_count = blocks.len() / column_count;
        let row_count = (block_count + column_width - 1) / column_width;
        for row in 0..row_count {
            let block_range = (row * column_width)..((row + 1) * column_width).min(block_count);
            let padding = column_width - block_range.len();

            for col in 0..column_count {
                out.push_str(vt100::COLOR_FG_WHITE);
                out.push('│');
                out.push_str(vt100::COLOR_FG_BRIGHT_YELLOW);

                for i in block_range.clone() {
                    out.push(blocks[i * column_count + col]);
                }
                out.push_str(&" ".repeat(padding));
            }
            out.push_str(vt100::COLOR_FG_WHITE);
            out.push_str("│\r\n");
        }

        // Draw footer
        out.push('└');
        for i in 0..column_count {
            if i != 0 {
                out.push('┴');
            }
            out.push_str(&"─".repeat(column_width));
        }
        out.push_str("┘\r\n");

        // Draw block labels
        out.push_str(vt100::MODE_BOLD);
        for col_name in column_names {
            out.push(' ');
            out.push_str(col_name);
            out.push_str(&" ".repeat(column_width.max(col_name.len()) - col_name.len()));
        }
        out.push_str(vt100::MODES_OFF);
        out.push_str("\r\n");

        // Draw block totals
        for col_total in column_totals {
            out.push(' ');
            let total = pretty_bytes(*col_total as f64);
            out.push_str(&total);
            out.push_str(&" ".repeat(column_width.max(total.len()) - total.len()));
        }
        out.push_str("\r\n");
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
        out.reserve((40 + 3 * column_width) * (row_count + 4));
        FileStatistics::print_block_stats(
            &mut out,
            width,
            &["Cold", "Read-Ahead", "Buffered"],
            &[
                self.total_file_reads_cold,
                self.total_file_reads_ahead,
                self.total_file_reads_cached,
            ],
            &block_chars,
            self.block_size,
            max,
        );
        out
    }

    pub fn print_page_stats(&self, width: usize) -> String {
        // Determine the maximum value per attribute to scale the block chars
        let mut max = 0;
        let block_count = self.get_block_count();
        for i in 0..block_count {
            let b = self.get_block_stats(i);
            max = max.max(b.page_loads);
            max = max.max(b.page_accesses);
        }

        // Collect all block chars
        let mut block_chars: Vec<char> = Vec::new();
        block_chars.resize(2 * block_count, '\0');
        for i in 0..block_count {
            let stats = self.get_block_stats(i);
            block_chars[2 * i + 0] = if stats.page_loads > 0 {
                BLOCK_CHARS[(stats.page_loads * 4 / max).min(3) as usize]
            } else {
                ' '
            };
            block_chars[2 * i + 1] = if stats.page_accesses > 0 {
                BLOCK_CHARS[(stats.page_accesses * 4 / max).min(3) as usize]
            } else {
                ' '
            };
        }
        let column_width = ((width.max(3) - 3) / 2).max(1);
        let row_count = (block_count + column_width - 1) / column_width;

        // Write all block chars
        let mut out = String::new();
        out.reserve((40 + 2 * column_width) * (row_count + 4));
        FileStatistics::print_block_stats(
            &mut out,
            width,
            &["Page Loads", "Page Hits"],
            &[self.total_page_loads, self.total_page_accesses],
            &block_chars,
            self.block_size,
            max,
        );
        out
    }
}
