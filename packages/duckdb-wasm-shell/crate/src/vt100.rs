// http://www.climagic.org/mirrors/VT100_Escape_Codes.html

pub const KEY_ENTER: u32 = 13;
pub const KEY_BACKSPACE: u32 = 8;
pub const KEY_ARROW_LEFT: u32 = 37;
pub const KEY_ARROW_UP: u32 = 38;
pub const KEY_ARROW_RIGHT: u32 = 39;
pub const KEY_ARROW_DOWN: u32 = 40;
pub const KEY_C: u32 = 67;
pub const KEY_L: u32 = 76;

pub const CURSOR_UP: &str = "\x1b[A";
pub const CURSOR_DOWN: &str = "\x1b[B";
pub const CURSOR_LEFT: &str = "\x1b[D";
pub const CURSOR_RIGHT: &str = "\x1b[C";
pub const REWIND: &str = "\r";
pub const ENDLINE: &str = "\r\n";

pub fn cursor_right<Buffer>(out: &mut Buffer, n: usize)
where
    Buffer: std::fmt::Write,
{
    write!(out, "\x1b[{}C", n).unwrap();
}

pub const CLEAR_LINE_CURSOR_RIGHT: &str = "\x1b[0K";
pub const CLEAR_LINE_CURSOR_LEFT: &str = "\x1b[1K";
pub const CLEAR_LINE: &str = "\x1b[2K";
pub const CLEAR_SCREEN_CURSOR_DOWN: &str = "\x1b[0J";
pub const CLEAR_SCREEN_CURSOR_UP: &str = "\x1b[1J";
pub const CLEAR_SCREEN: &str = "\x1b[2J";

pub const MODES_OFF: &str = "\x1b[m";
pub const MODE_BOLD: &str = "\x1b[1m";

pub const CURSOR_HOME: &str = "\x1b[H";
