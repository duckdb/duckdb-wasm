use crate::vt100;
use crate::xterm::Terminal;
use ropey::Rope;
use std::fmt::Write;
use web_sys::KeyboardEvent;

const PROMPT_INIT: &'static str = "duckdb> ";
const PROMPT_CONT: &'static str = "   ...> ";

pub struct PromptBuffer {
    /// The pending output buffer
    output_buffer: String,
    /// The input buffer
    text_buffer: Rope,
    /// The iterator
    cursor: usize,
}

impl PromptBuffer {
    /// Construct prompt buffer
    pub fn default() -> Self {
        Self {
            output_buffer: String::new(),
            text_buffer: Rope::new(),
            cursor: 0,
        }
    }

    /// Get input string
    pub fn get_input(&mut self) -> String {
        let buffer: String = self.text_buffer.slice(..).into();
        buffer
    }

    /// Flush to output buffer
    fn flush(&mut self, term: &Terminal) {
        term.write(&self.output_buffer);
        self.output_buffer.clear();
    }

    /// Start new prompt
    pub fn reset(&mut self, term: &Terminal) {
        self.output_buffer.clear();
        self.text_buffer = Rope::new();
        self.cursor = 0;
        write!(self.output_buffer, "{}", PROMPT_INIT).unwrap();
        self.flush(term);
    }

    /// Write a char
    pub fn write_char(&mut self, c: char) {
        write!(self.output_buffer, "{}", c).unwrap();
        self.text_buffer.insert_char(self.cursor, c);
        self.cursor += 1;
    }

    /// Process key event
    pub fn consume(&mut self, event: KeyboardEvent, term: &Terminal) {
        match event.key_code() {
            vt100::KEY_ENTER => {
                self.text_buffer.insert_char(self.cursor, '\n');
                write!(
                    self.output_buffer,
                    "{endl}{prompt_cont}",
                    endl = vt100::ENDLINE,
                    prompt_cont = PROMPT_CONT
                )
                .unwrap();
                self.cursor += 1;
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
            vt100::KEY_LEFT_ARROW => {
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
            vt100::KEY_RIGHT_ARROW => {
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
                    self.write_char(event.key().chars().next().unwrap());
                }
            }
        }
        self.flush(term);
    }
}
