// http://www.climagic.org/mirrors/VT100_Escape_Codes.html

// Keyboard keys
// https://notes.burke.libbey.me/ansi-escape-codes/
pub const KEY_ENTER: u32 = 13;
pub const KEY_BACKSPACE: u32 = 8;
pub const KEY_LEFT_ARROW: u32 = 37;
pub const KEY_RIGHT_ARROW: u32 = 39;
pub const KEY_C: u32 = 67;
pub const KEY_L: u32 = 76;

pub const CURSOR_LEFT: &str = "\x1b[D";
pub const CURSOR_RIGHT: &str = "\x1b[C";
pub const REWIND: &str = "\r";
pub const ENDLINE: &str = "\n\r";

pub const CLEAR_LINE_CURSOR_RIGHT: &str = "\x1b[0K";
pub const CLEAR_LINE_CURSOR_LEFT: &str = "\x1b[1K";
pub const CLEAR_LINE: &str = "\x1b[2K";
pub const CLEAR_SCREEN_CURSOR_DOWN: &str = "\x1b[0J";
pub const CLEAR_SCREEN_CURSOR_UP: &str = "\x1b[1J";
pub const CLEAR_SCREEN: &str = "\x1b[2J";

pub const MODES_OFF: &str = "\x1b[m";
pub const MODE_BOLD: &str = "\x1b[1m";

pub const CURSOR_HOME: &str = "\x1b[H";
