use crate::vt100;
use crate::xterm::Terminal;
use ropey::Rope;
use std::fmt::Write;
use web_sys::KeyboardEvent;

const PROMPT_INIT: &'static str = "duckdb> ";
const PROMPT_CONT: &'static str = "   ...> ";
const PROMPT_WIDTH: usize = 8;

pub struct PromptBuffer {
    /// The pending output buffer
    output_buffer: String,
    /// The input buffer
    text_buffer: Rope,
    /// The iterator
    cursor: usize,
    /// The terminal width
    terminal_width: usize,
}

impl PromptBuffer {
    /// Construct prompt buffer
    pub fn default() -> Self {
        Self {
            output_buffer: String::new(),
            text_buffer: Rope::new(),
            cursor: 0,
            terminal_width: 0,
        }
    }

    /// Configure the terminal
    pub fn configure(&mut self, term: &Terminal) {
        self.terminal_width = term.get_cols() as usize;
    }

    /// Get input string
    pub fn get_input(&mut self) -> String {
        let buffer: String = self
            .text_buffer
            .chars()
            .map(|c| match c {
                vt100::PARAGRAPH_SEPERATOR => '\n',
                c => c,
            })
            .collect();
        buffer
    }

    /// Flush to output buffer
    pub fn flush(&mut self, term: &Terminal) {
        term.write(&self.output_buffer);
        self.output_buffer.clear();
    }

    /// Start new prompt
    pub fn reset(&mut self) {
        self.output_buffer.clear();
        self.text_buffer = Rope::new();
        self.cursor = 0;
        write!(self.output_buffer, "{}", PROMPT_INIT).unwrap();
    }

    /// Insert a newline at the cursor
    fn insert_newline(&mut self) {
        self.text_buffer.insert_char(self.cursor, '\n');
        write!(
            self.output_buffer,
            "{endl}{prompt_cont}",
            endl = vt100::CRLF,
            prompt_cont = PROMPT_CONT
        )
        .unwrap();
        self.cursor += 1;
    }

    /// Insert an artificial newline as line wrap at the cursor
    fn insert_linewrap(&mut self) {
        self.text_buffer
            .insert_char(self.cursor, vt100::PARAGRAPH_SEPERATOR);
        write!(
            self.output_buffer,
            "{endl}{prompt_cont}",
            endl = vt100::CRLF,
            prompt_cont = PROMPT_CONT
        )
        .unwrap();
        self.cursor += 1;
    }

    /// Insert a character at the cursor
    fn insert_char(&mut self, c: char) {
        let line_id = self.text_buffer.char_to_line(self.cursor);
        let line = match self.text_buffer.lines_at(line_id).next() {
            Some(rope) => rope,
            None => return,
        };
        if (PROMPT_WIDTH + line.len_chars()) >= self.terminal_width {
            self.insert_linewrap();
        }
        self.text_buffer.insert_char(self.cursor, c);
        self.cursor += 1;
        write!(self.output_buffer, "{}", self.text_buffer.len_lines()).unwrap();
    }

    /// Process key event
    pub fn consume(&mut self, event: KeyboardEvent) {
        match event.key_code() {
            vt100::KEY_ENTER => {
                self.insert_newline();
            }
            vt100::KEY_BACKSPACE => {
                let mut iter = self.text_buffer.chars_at(self.cursor);
                match iter.prev() {
                    Some(c) => {
                        // Remove line break?
                        if c == '\n' {
                            // XXX
                            //
                        } else {
                            write!(self.output_buffer, "{}", "\u{0008} \u{0008}").unwrap();
                            self.text_buffer.remove((self.cursor - 1)..(self.cursor));
                            self.cursor -= 1;
                        }
                    }
                    None => return,
                }
            }
            vt100::KEY_ARROW_UP | vt100::KEY_ARROW_DOWN => return,
            vt100::KEY_ARROW_LEFT => {
                let mut iter = self.text_buffer.chars_at(self.cursor);
                match iter.prev() {
                    Some(c) => {
                        // Move to end of previous line?
                        if c == '\n' {
                            let line_id = self.text_buffer.char_to_line(self.cursor - 1);
                            let line = self.text_buffer.line(line_id);
                            write!(
                                self.output_buffer,
                                "{rewind}{cursor_up}",
                                rewind = vt100::REWIND,
                                cursor_up = vt100::CURSOR_UP
                            )
                            .unwrap();
                            vt100::cursor_right(&mut self.output_buffer, line.len_chars());
                        } else {
                            write!(
                                self.output_buffer,
                                "{cursor_left}",
                                cursor_left = vt100::CURSOR_LEFT
                            )
                            .unwrap()
                        }
                        self.cursor -= 1;
                    }
                    // Reached beginning of input
                    None => return,
                }
            }
            vt100::KEY_ARROW_RIGHT => {
                let mut iter = self.text_buffer.chars_at(self.cursor);
                match iter.next() {
                    Some(c) => {
                        // Move to beginning of previous line?
                        if c == '\n' {
                            write!(
                                self.output_buffer,
                                "{rewind}{cursor_down}",
                                rewind = vt100::REWIND,
                                cursor_down = vt100::CURSOR_DOWN
                            )
                            .unwrap();
                            vt100::cursor_right(&mut self.output_buffer, PROMPT_INIT.len());
                        } else {
                            write!(
                                self.output_buffer,
                                "{cursor_right}",
                                cursor_right = vt100::CURSOR_RIGHT
                            )
                            .unwrap()
                        }
                        self.cursor += 1;
                    }
                    // Reached end of input
                    None => return,
                }
            }
            _ => {
                if !event.alt_key() && !event.alt_key() && !event.ctrl_key() && !event.meta_key() {
                    self.insert_char(event.key().chars().next().unwrap());
                }
            }
        }
    }
}
