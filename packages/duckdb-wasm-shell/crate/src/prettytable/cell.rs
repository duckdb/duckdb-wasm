//! This module contains definition of table/row cells stuff

use super::format::Alignment;
use super::utils::{display_width, print_align};
use std::io::{Error, Write};
use std::str::FromStr;
use std::string::ToString;

/// Terminal color definitions
pub mod color {
    /// Number for a terminal color
    pub type Color = u32;

    pub const BLACK: Color = 0;
    pub const RED: Color = 1;
    pub const GREEN: Color = 2;
    pub const YELLOW: Color = 3;
    pub const BLUE: Color = 4;
    pub const MAGENTA: Color = 5;
    pub const CYAN: Color = 6;
    pub const WHITE: Color = 7;

    pub const BRIGHT_BLACK: Color = 8;
    pub const BRIGHT_RED: Color = 9;
    pub const BRIGHT_GREEN: Color = 10;
    pub const BRIGHT_YELLOW: Color = 11;
    pub const BRIGHT_BLUE: Color = 12;
    pub const BRIGHT_MAGENTA: Color = 13;
    pub const BRIGHT_CYAN: Color = 14;
    pub const BRIGHT_WHITE: Color = 15;
}

#[derive(Debug, PartialEq, Hash, Eq, Copy, Clone)]
pub enum Attr {
    /// Bold (or possibly bright) mode
    Bold,
    /// Dim mode, also called faint or half-bright. Often not supported
    Dim,
    /// Italics mode. Often not supported
    Italic(bool),
    /// Underline mode
    Underline(bool),
    /// Blink mode
    Blink,
    /// Standout mode. Often implemented as Reverse, sometimes coupled with Bold
    Standout(bool),
    /// Reverse mode, inverts the foreground and background colors
    Reverse,
    /// Secure mode, also called invis mode. Hides the printed text
    Secure,
    /// Convenience attribute to set the foreground color
    ForegroundColor(color::Color),
    /// Convenience attribute to set the background color
    BackgroundColor(color::Color),
}

/// Represent a table cell containing a string.
///
/// Once created, a cell's content cannot be modified.
/// The cell would have to be replaced by another one
#[derive(Clone, Debug, Hash, PartialEq, Eq)]
pub struct Cell {
    content: Vec<String>,
    width: usize,
    align: Alignment,
    style: Vec<Attr>,
    hspan: usize,
}

impl Cell {
    /// Create a new `Cell` initialized with content from `string`.
    /// Text alignment in cell is configurable with the `align` argument
    pub fn new_align(string: &str, align: Alignment) -> Cell {
        let content: Vec<String> = string.lines().map(|x| x.to_string()).collect();
        let mut width = 0;
        for cont in &content {
            let l = display_width(&cont[..]);
            if l > width {
                width = l;
            }
        }
        Cell {
            content: content,
            width: width,
            align: align,
            style: Vec::new(),
            hspan: 1,
        }
    }

    /// Create a new `Cell` initialized with content from `string`.
    /// By default, content is align to `LEFT`
    pub fn new(string: &str) -> Cell {
        Cell::new_align(string, Alignment::LEFT)
    }

    /// Set text alignment in the cell
    pub fn align(&mut self, align: Alignment) {
        self.align = align;
    }

    /// Add a style attribute to the cell
    pub fn style(&mut self, attr: Attr) {
        self.style.push(attr);
    }

    /// Add a style attribute to the cell. Can be chained
    pub fn with_style(mut self, attr: Attr) -> Cell {
        self.style(attr);
        self
    }

    /// Add horizontal spanning to the cell
    pub fn with_hspan(mut self, hspan: usize) -> Cell {
        self.set_hspan(hspan);
        self
    }

    /// Remove all style attributes and reset alignment to default (LEFT)
    pub fn reset_style(&mut self) {
        self.style.clear();
        self.align(Alignment::LEFT);
    }

    /// Set the cell's style by applying the given specifier string
    ///
    /// # Style spec syntax
    ///
    /// The syntax for the style specifier looks like this :
    /// **FrBybl** which means **F**oreground **r**ed **B**ackground **y**ellow **b**old **l**eft
    ///
    /// ### List of supported specifiers :
    ///
    /// * **F** : **F**oreground (must be followed by a color specifier)
    /// * **B** : **B**ackground (must be followed by a color specifier)
    /// * **H** : **H**orizontal span (must be followed by a number)
    /// * **b** : **b**old
    /// * **i** : **i**talic
    /// * **u** : **u**nderline
    /// * **c** : Align **c**enter
    /// * **l** : Align **l**eft
    /// * **r** : Align **r**ight
    /// * **d** : **d**efault style
    ///
    /// ### List of color specifiers :
    ///
    /// * **r** : Red
    /// * **b** : Blue
    /// * **g** : Green
    /// * **y** : Yellow
    /// * **c** : Cyan
    /// * **m** : Magenta
    /// * **w** : White
    /// * **d** : Black
    ///
    /// And capital letters are for **bright** colors.
    /// Eg :
    ///
    /// * **R** : Bright Red
    /// * **B** : Bright Blue
    /// * ... and so on ...
    pub fn style_spec(mut self, spec: &str) -> Cell {
        self.reset_style();
        let mut foreground = false;
        let mut background = false;
        let mut it = spec.chars().peekable();
        while let Some(c) = it.next() {
            if foreground || background {
                let color = match c {
                    'r' => color::RED,
                    'R' => color::BRIGHT_RED,
                    'b' => color::BLUE,
                    'B' => color::BRIGHT_BLUE,
                    'g' => color::GREEN,
                    'G' => color::BRIGHT_GREEN,
                    'y' => color::YELLOW,
                    'Y' => color::BRIGHT_YELLOW,
                    'c' => color::CYAN,
                    'C' => color::BRIGHT_CYAN,
                    'm' => color::MAGENTA,
                    'M' => color::BRIGHT_MAGENTA,
                    'w' => color::WHITE,
                    'W' => color::BRIGHT_WHITE,
                    'd' => color::BLACK,
                    'D' => color::BRIGHT_BLACK,
                    _ => {
                        // Silently ignore unknown tags
                        foreground = false;
                        background = false;
                        continue;
                    }
                };
                if foreground {
                    self.style(Attr::ForegroundColor(color));
                } else if background {
                    self.style(Attr::BackgroundColor(color));
                }
                foreground = false;
                background = false;
            } else {
                match c {
                    'F' => foreground = true,
                    'B' => background = true,
                    'b' => self.style(Attr::Bold),
                    'i' => self.style(Attr::Italic(true)),
                    'u' => self.style(Attr::Underline(true)),
                    'c' => self.align(Alignment::CENTER),
                    'l' => self.align(Alignment::LEFT),
                    'r' => self.align(Alignment::RIGHT),
                    'H' => {
                        let mut span_s = String::new();
                        while let Some('0'..='9') = it.peek() {
                            span_s.push(it.next().unwrap());
                        }
                        let span = usize::from_str(&span_s).unwrap();
                        self.set_hspan(span);
                    }
                    _ => { /* Silently ignore unknown tags */ }
                }
            }
        }
        self
    }

    /// Return the height of the cell
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn get_height(&self) -> usize {
        self.content.len()
    }

    /// Return the width of the cell
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn get_width(&self) -> usize {
        self.width
    }

    /// Set horizontal span for this cell (must be > 0)
    pub fn set_hspan(&mut self, hspan: usize) {
        self.hspan = if hspan == 0 { 1 } else { hspan };
    }

    /// Get horizontal span of this cell (> 0)
    pub fn get_hspan(&self) -> usize {
        self.hspan
    }

    /// Return a copy of the full string contained in the cell
    pub fn get_content(&self) -> String {
        self.content.join("\n")
    }

    /// Print a partial cell to `out`. Since the cell may be multi-lined,
    /// `idx` is the line index to print. `col_width` is the column width used to
    /// fill the cells with blanks so it fits in the table.
    /// If `ìdx` is higher than this cell's height, it will print empty content
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn print<T: Write + ?Sized>(
        &self,
        out: &mut T,
        idx: usize,
        col_width: usize,
        skip_right_fill: bool,
    ) -> Result<(), Error> {
        let c = self.content.get(idx).map(|s| s.as_ref()).unwrap_or("");
        print_align(out, self.align, c, ' ', col_width, skip_right_fill)
    }
}

impl<'a, T: ToString> From<&'a T> for Cell {
    fn from(f: &T) -> Cell {
        Cell::new(&f.to_string())
    }
}

impl ToString for Cell {
    fn to_string(&self) -> String {
        self.get_content()
    }
}

impl Default for Cell {
    /// Return a cell initialized with a single empty `String`, with LEFT alignment
    fn default() -> Cell {
        Cell {
            content: vec!["".to_string(); 1],
            width: 0,
            align: Alignment::LEFT,
            style: Vec::new(),
            hspan: 1,
        }
    }
}

/// This macro simplifies `Cell` creation
#[macro_export]
macro_rules! cell {
    () => {
        $crate::Cell::default()
    };
    ($value:expr) => {
        $crate::Cell::new(&$value.to_string())
    };
    ($style:ident -> $value:expr) => {
        $crate::cell!($value).style_spec(stringify!($style))
    };
}

#[cfg(test)]
mod tests {
    use super::super::format::Alignment;
    use super::super::utils::StringWriter;
    use super::Cell;
    use super::{color, Attr};

    #[test]
    fn get_content() {
        let cell = Cell::new("test");
        assert_eq!(cell.get_content(), "test");
    }

    #[test]
    fn print_ascii() {
        let ascii_cell = Cell::new("hello");
        assert_eq!(ascii_cell.get_width(), 5);

        let mut out = StringWriter::new();
        let _ = ascii_cell.print(&mut out, 0, 10, false);
        assert_eq!(out.as_string(), "hello     ");
    }

    #[test]
    fn print_unicode() {
        let unicode_cell = Cell::new("привет");
        assert_eq!(unicode_cell.get_width(), 6);

        let mut out = StringWriter::new();
        let _ = unicode_cell.print(&mut out, 0, 10, false);
        assert_eq!(out.as_string(), "привет    ");
    }

    #[test]
    fn print_cjk() {
        let unicode_cell = Cell::new("由系统自动更新");
        assert_eq!(unicode_cell.get_width(), 14);
        let mut out = StringWriter::new();
        let _ = unicode_cell.print(&mut out, 0, 20, false);
        assert_eq!(out.as_string(), "由系统自动更新      ");
    }

    #[test]
    fn align_left() {
        let cell = Cell::new_align("test", Alignment::LEFT);
        let mut out = StringWriter::new();
        let _ = cell.print(&mut out, 0, 10, false);
        assert_eq!(out.as_string(), "test      ");
    }

    #[test]
    fn align_center() {
        let cell = Cell::new_align("test", Alignment::CENTER);
        let mut out = StringWriter::new();
        let _ = cell.print(&mut out, 0, 10, false);
        assert_eq!(out.as_string(), "   test   ");
    }

    #[test]
    fn align_right() {
        let cell = Cell::new_align("test", Alignment::RIGHT);
        let mut out = StringWriter::new();
        let _ = cell.print(&mut out, 0, 10, false);
        assert_eq!(out.as_string(), "      test");
    }

    #[test]
    fn style_spec() {
        let mut cell = Cell::new("test").style_spec("FrBBbuic");
        assert_eq!(cell.style.len(), 5);
        assert!(cell.style.contains(&Attr::Underline(true)));
        assert!(cell.style.contains(&Attr::Italic(true)));
        assert!(cell.style.contains(&Attr::Bold));
        assert!(cell.style.contains(&Attr::ForegroundColor(color::RED)));
        assert!(cell
            .style
            .contains(&Attr::BackgroundColor(color::BRIGHT_BLUE)));
        assert_eq!(cell.align, Alignment::CENTER);

        cell = cell.style_spec("FDBwr");
        assert_eq!(cell.style.len(), 2);
        assert!(cell
            .style
            .contains(&Attr::ForegroundColor(color::BRIGHT_BLACK)));
        assert!(cell.style.contains(&Attr::BackgroundColor(color::WHITE)));
        assert_eq!(cell.align, Alignment::RIGHT);

        // Test with invalid sepcifier chars
        cell = cell.clone();
        cell = cell.style_spec("FzBr");
        assert!(cell.style.contains(&Attr::BackgroundColor(color::RED)));
        assert_eq!(cell.style.len(), 1);
        cell = cell.style_spec("zzz");
        assert!(cell.style.is_empty());
        assert_eq!(cell.get_hspan(), 1);
        cell = cell.style_spec("FDBwH03r");
        assert_eq!(cell.get_hspan(), 3);
    }

    #[test]
    fn reset_style() {
        let mut cell = Cell::new("test")
            .with_style(Attr::ForegroundColor(color::BRIGHT_BLACK))
            .with_style(Attr::BackgroundColor(color::WHITE));
        cell.align(Alignment::RIGHT);

        //style_spec("FDBwr");
        assert_eq!(cell.style.len(), 2);
        assert_eq!(cell.align, Alignment::RIGHT);
        cell.reset_style();
        assert_eq!(cell.style.len(), 0);
        assert_eq!(cell.align, Alignment::LEFT);
    }

    #[test]
    fn default_empty_cell() {
        let cell = Cell::default();
        assert_eq!(cell.align, Alignment::LEFT);
        assert!(cell.style.is_empty());
        assert_eq!(cell.get_content(), "");
        assert_eq!(cell.to_string(), "");
        assert_eq!(cell.get_height(), 1);
        assert_eq!(cell.get_width(), 0);
    }
}
