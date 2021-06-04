//! Internal only utilities
use std::fmt;
use std::io::{Error, ErrorKind, Write};
use std::str;

use unicode_width::UnicodeWidthStr;

use super::format::Alignment;

pub static NEWLINE: &[u8] = b"\r\n";

/// Internal utility for writing data into a string
pub struct StringWriter {
    string: String,
}

impl StringWriter {
    /// Create a new `StringWriter`
    pub fn new() -> StringWriter {
        StringWriter {
            string: String::new(),
        }
    }

    /// Return a reference to the internally written `String`
    pub fn as_string(&self) -> &str {
        &self.string
    }
}

impl Write for StringWriter {
    fn write(&mut self, data: &[u8]) -> Result<usize, Error> {
        let string = match str::from_utf8(data) {
            Ok(s) => s,
            Err(e) => {
                return Err(Error::new(
                    ErrorKind::Other,
                    format!("Cannot decode utf8 string : {}", e),
                ))
            }
        };
        self.string.push_str(string);
        Ok(data.len())
    }

    fn flush(&mut self) -> Result<(), Error> {
        // Nothing to do here
        Ok(())
    }
}

/// Align/fill a string and print it to `out`
/// If `skip_right_fill` is set to `true`, then no space will be added after the string
/// to complete alignment
pub fn print_align<T: Write + ?Sized>(
    out: &mut T,
    align: Alignment,
    text: &str,
    fill: char,
    size: usize,
    skip_right_fill: bool,
) -> Result<(), Error> {
    let text_len = display_width(text);
    let mut nfill = if text_len < size { size - text_len } else { 0 };
    let n = match align {
        Alignment::LEFT => 0,
        Alignment::RIGHT => nfill,
        Alignment::CENTER => nfill / 2,
    };
    if n > 0 {
        out.write_all(&vec![fill as u8; n])?;
        nfill -= n;
    }
    out.write_all(text.as_bytes())?;
    if nfill > 0 && !skip_right_fill {
        out.write_all(&vec![fill as u8; nfill])?;
    }
    Ok(())
}

/// Return the display width of a unicode string.
/// This functions takes ANSI-escaped color codes into account.
pub fn display_width(text: &str) -> usize {
    let width = UnicodeWidthStr::width(text);
    let mut state = 0;
    let mut hidden = 0;

    for c in text.chars() {
        state = match (state, c) {
            (0, '\u{1b}') => 1,
            (1, '[') => 2,
            (1, _) => 0,
            (2, 'm') => 3,
            _ => state,
        };

        // We don't count escape characters as hidden as
        // UnicodeWidthStr::width already considers them.
        if state > 1 {
            hidden += 1;
        }

        if state == 3 {
            state = 0;
        }
    }

    width - hidden
}

/// Wrapper struct which will emit the HTML-escaped version of the contained
/// string when passed to a format string.
pub struct HtmlEscape<'a>(pub &'a str);

impl<'a> fmt::Display for HtmlEscape<'a> {
    fn fmt(&self, fmt: &mut fmt::Formatter) -> fmt::Result {
        // Because the internet is always right, turns out there's not that many
        // characters to escape: http://stackoverflow.com/questions/7381974
        let HtmlEscape(s) = *self;
        let pile_o_bits = s;
        let mut last = 0;
        for (i, ch) in s.bytes().enumerate() {
            match ch as char {
                '<' | '>' | '&' | '\'' | '"' => {
                    fmt.write_str(&pile_o_bits[last..i])?;
                    let s = match ch as char {
                        '>' => "&gt;",
                        '<' => "&lt;",
                        '&' => "&amp;",
                        '\'' => "&#39;",
                        '"' => "&quot;",
                        _ => unreachable!(),
                    };
                    fmt.write_str(s)?;
                    last = i + 1;
                }
                _ => {}
            }
        }

        if last < s.len() {
            fmt.write_str(&pile_o_bits[last..])?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::super::format::Alignment;
    use super::*;
    use std::io::Write;

    #[test]
    fn string_writer() {
        let mut out = StringWriter::new();
        out.write_all(b"foo").unwrap();
        out.write_all(b" ").unwrap();
        out.write_all(b"").unwrap();
        out.write_all(b"bar").unwrap();
        assert_eq!(out.as_string(), "foo bar");
    }

    #[test]
    fn fill_align() {
        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::RIGHT, "foo", '*', 10, false).unwrap();
        assert_eq!(out.as_string(), "*******foo");

        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::LEFT, "foo", '*', 10, false).unwrap();
        assert_eq!(out.as_string(), "foo*******");

        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::CENTER, "foo", '*', 10, false).unwrap();
        assert_eq!(out.as_string(), "***foo****");

        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::CENTER, "foo", '*', 1, false).unwrap();
        assert_eq!(out.as_string(), "foo");
    }

    #[test]
    fn skip_right_fill() {
        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::RIGHT, "foo", '*', 10, true).unwrap();
        assert_eq!(out.as_string(), "*******foo");

        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::LEFT, "foo", '*', 10, true).unwrap();
        assert_eq!(out.as_string(), "foo");

        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::CENTER, "foo", '*', 10, true).unwrap();
        assert_eq!(out.as_string(), "***foo");

        let mut out = StringWriter::new();
        print_align(&mut out, Alignment::CENTER, "foo", '*', 1, false).unwrap();
        assert_eq!(out.as_string(), "foo");
    }

    #[test]
    fn utf8_error() {
        let mut out = StringWriter::new();
        let res = out.write_all(&[0, 255]);
        assert!(res.is_err());
    }
}
