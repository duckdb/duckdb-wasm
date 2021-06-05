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

    /// Flush output buffer to the terminal
    pub fn flush(&mut self, term: &Terminal) {
        term.write(&self.output_buffer);
        self.output_buffer.clear();
    }

    /// Collect as string.
    /// We replace all paragraph separators with real line feeds for the user.
    pub fn collect(&mut self) -> String {
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

    /// Reset the prompt
    pub fn reset(&mut self) {
        self.output_buffer.clear();
        self.text_buffer = Rope::new();
        self.cursor = 0;
        write!(self.output_buffer, "{}", PROMPT_INIT).unwrap();
    }

    /// Insert a newline at the cursor.
    /// Writes the prompt continuation string.
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

    /// Insert an artificial newline as line wrap at the cursor.
    /// The rope interprets the paragraph separator as newline.
    /// We can therefore use the character as 'artificial' newline character and skip it during reflows.
    /// Writes the prompt continuation string.
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

    /// Clear the output
    fn erase_prompt(&mut self) {
        // Is only a single line?
        // Just clear the line and move cursor to the beginning.
        let line_idx = self.text_buffer.char_to_line(self.cursor);
        let line_count = self.text_buffer.len_lines();
        if line_count == 1 {
            self.output_buffer.push_str(vt100::CLEAR_LINE);
            self.output_buffer.push(vt100::CR);
            self.cursor = 0;
            return;
        }

        // Move cursor to the last line
        assert!(line_idx < line_count);
        self.output_buffer.push(vt100::CR);
        if (line_idx + 1) < line_count {
            vt100::cursor_down(&mut self.output_buffer, (line_count - 1) - line_idx);
        }

        // Clear all lines
        self.output_buffer.push_str(vt100::CLEAR_LINE);
        for _ in 1..line_count {
            self.output_buffer.push_str(vt100::CURSOR_UP);
            self.output_buffer.push_str(vt100::CLEAR_LINE);
        }
        self.cursor = 0;
    }

    /// Move cursor to position in prompt text
    fn move_to(&mut self, pos: usize) {
        let src_line_id = self.text_buffer.char_to_line(self.cursor);
        let dst_line_id = self.text_buffer.char_to_line(pos);
        if src_line_id < dst_line_id {
            vt100::cursor_down(&mut self.output_buffer, dst_line_id - src_line_id);
        } else if src_line_id > dst_line_id {
            vt100::cursor_up(&mut self.output_buffer, src_line_id - dst_line_id);
        }
        let src_col = self.cursor - self.text_buffer.line_to_char(src_line_id);
        let dst_col = pos - self.text_buffer.line_to_char(dst_line_id);
        if src_col < dst_col {
            vt100::cursor_right(&mut self.output_buffer, dst_col - src_col);
        } else if src_col > dst_col {
            vt100::cursor_left(&mut self.output_buffer, src_col - dst_col);
        }
        self.cursor = pos;
    }

    /// Reflow the text buffer
    fn reflow<F>(&mut self, modify: F)
    where
        F: Fn(&mut Rope) -> (),
    {
        // First erase the prompt since we need a valid text buffer for clearing
        self.erase_prompt();
        // Then adjust the rope with the provided function
        modify(&mut self.text_buffer);

        // Rebuild text and output
        let mut reflowed_txt = String::new();
        let mut reflowed_out = String::new();
        let mut line_length = PROMPT_INIT.len();
        write!(&mut reflowed_out, "{}", PROMPT_INIT).unwrap();

        // Write all chars in the rope
        for c in self.text_buffer.chars() {
            match c {
                // Skip artifical line wraps
                vt100::PARAGRAPH_SEPERATOR => {}

                // Preserve explicit newlines
                '\n' => {
                    reflowed_txt.push('\n');
                    write!(
                        &mut reflowed_out,
                        "{endl}{prompt_cont}",
                        endl = vt100::CRLF,
                        prompt_cont = PROMPT_CONT
                    )
                    .unwrap();
                    line_length = PROMPT_CONT.len();
                }

                // Write all other characters and wrap lines if necessary
                _ => {
                    reflowed_txt.push(c);
                    reflowed_out.push(c);
                    line_length += 1;
                    if (line_length + 1) >= self.terminal_width {
                        reflowed_txt.push(vt100::PARAGRAPH_SEPERATOR);
                        write!(
                            reflowed_out,
                            "{endl}{prompt_cont}",
                            endl = vt100::CRLF,
                            prompt_cont = PROMPT_CONT
                        )
                        .unwrap();
                        line_length = 0;
                    }
                }
            }
        }

        // Rewrite the entire prompt
        self.output_buffer.push_str(&reflowed_out);
        self.text_buffer = Rope::from_str(&reflowed_txt);
        self.cursor = self.text_buffer.len_chars();
    }

    /// Insert a single character at the cursor.
    /// Takes care of line wrapping, if necessary
    fn insert_char(&mut self, c: char) {
        // Cursor is at end?
        // We short-circuit that case since we don't need to take care of following lines.
        if self.cursor == self.text_buffer.len_chars() {
            let line_id = self.text_buffer.char_to_line(self.cursor);
            let line = match self.text_buffer.lines_at(line_id).next() {
                Some(rope) => rope,
                None => return,
            };
            if (PROMPT_WIDTH + line.len_chars() + 1) >= self.terminal_width {
                self.insert_linewrap();
            }
            self.text_buffer.insert_char(self.cursor, c);
            self.cursor += 1;
            self.output_buffer.push(c);
        } else {
            // Otherwise reflow since we might need new line-wraps
            let pos = self.cursor;
            self.reflow(|buffer| buffer.insert_char(pos, c));
            self.move_to(pos + 1);
        }
    }

    /// Process key event
    pub fn consume(&mut self, event: KeyboardEvent) {
        match event.key_code() {
            vt100::KEY_ENTER => {
                // Insert a newline
                self.insert_newline();
                // Reflow if cursor is not at end
                let pos = self.cursor;
                if pos != self.text_buffer.len_chars() {
                    self.reflow(|_| ());
                    self.move_to(pos);
                }
            }
            vt100::KEY_BACKSPACE => {
                let mut iter = self.text_buffer.chars_at(self.cursor);
                match iter.prev() {
                    Some(c) => {
                        match c {
                            // Remove explicit newline?
                            // Removing newlines is expensive since we have to reflow the following lines.
                            '\n' => {
                                let pos = self.cursor;
                                self.reflow(|buffer| buffer.remove((pos - 1)..(pos)));
                                self.move_to(pos - 1);
                            }

                            // Previous character is an artificial line wrap?
                            // In that case, we'll delete the character before that character.
                            vt100::PARAGRAPH_SEPERATOR => {}

                            // In all other cases, just remove the character
                            _ => {
                                let pos = self.cursor;
                                if pos == self.text_buffer.len_chars() {
                                    write!(self.output_buffer, "{}", "\u{0008} \u{0008}").unwrap();
                                    self.text_buffer.remove((self.cursor - 1)..(self.cursor));
                                    self.cursor -= 1;
                                } else {
                                    self.reflow(|buffer| buffer.remove((pos - 1)..(pos)));
                                    self.move_to(pos - 1);
                                }
                            }
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
                        match c {
                            // Move to end of previous line?
                            '\n' | vt100::PARAGRAPH_SEPERATOR => {
                                let line_id = self.text_buffer.char_to_line(self.cursor - 1);
                                let line = self.text_buffer.line(line_id);
                                write!(
                                    self.output_buffer,
                                    "{rewind}{cursor_up}",
                                    rewind = vt100::CR,
                                    cursor_up = vt100::CURSOR_UP
                                )
                                .unwrap();
                                vt100::cursor_right(
                                    &mut self.output_buffer,
                                    PROMPT_WIDTH + line.len_chars() - 1,
                                );
                            }
                            _ => write!(
                                self.output_buffer,
                                "{cursor_left}",
                                cursor_left = vt100::CURSOR_LEFT
                            )
                            .unwrap(),
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
                        match c {
                            // Move to beginning of previous line?
                            '\n' | vt100::PARAGRAPH_SEPERATOR => {
                                write!(
                                    self.output_buffer,
                                    "{rewind}{cursor_down}",
                                    rewind = vt100::CR,
                                    cursor_down = vt100::CURSOR_DOWN
                                )
                                .unwrap();
                                vt100::cursor_right(&mut self.output_buffer, PROMPT_WIDTH);
                            }
                            _ => write!(
                                self.output_buffer,
                                "{cursor_right}",
                                cursor_right = vt100::CURSOR_RIGHT
                            )
                            .unwrap(),
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
