//! Define table formatting utilities

use std::io::{Error, Write};

use encode_unicode::Utf8Char;

use super::utils::NEWLINE;

/// Alignment for cell's content
#[derive(Clone, Debug, PartialEq, Copy, Hash, Eq)]
pub enum Alignment {
    /// Align left
    LEFT,
    /// Align in the center
    CENTER,
    /// Align right
    RIGHT,
}

/// Position of a line separator in a table
#[derive(Clone, Debug, PartialEq, Copy, Hash, Eq)]
pub enum LinePosition {
    /// Table's border on top
    Top,
    /// Line separator between the titles row,
    /// and the first data row
    Title,
    /// Line separator between data rows
    Intern,
    /// Bottom table's border
    Bottom,
}

/// Position of a column separator in a row
#[derive(Clone, Debug, PartialEq, Copy, Hash, Eq)]
pub enum ColumnPosition {
    /// Left table's border
    Left,
    /// Internal column separators
    Intern,
    /// Rigth table's border
    Right,
}

/// Contains the character used for printing a line separator
#[derive(Clone, Debug, Copy, Hash, PartialEq, Eq)]
pub struct LineSeparator {
    /// Line separator
    line: char,
    /// Internal junction separator
    junc: char,
    /// Left junction separator
    ljunc: char,
    /// Right junction separator
    rjunc: char,
}

impl LineSeparator {
    /// Create a new line separator instance where `line` is the character used to separate 2 lines
    /// and `junc` is the one used for junctions between columns and lines
    pub fn new(line: char, junc: char, ljunc: char, rjunc: char) -> LineSeparator {
        LineSeparator {
            line,
            junc,
            ljunc,
            rjunc,
        }
    }

    /// Print a full line separator to `out`. `col_width` is a slice containing the width of each column.
    /// Returns the number of printed lines
    fn print<T: Write + ?Sized>(
        &self,
        out: &mut T,
        col_width: &[usize],
        padding: (usize, usize),
        colsep: bool,
        lborder: bool,
        rborder: bool,
    ) -> Result<usize, Error> {
        if lborder {
            out.write_all(Utf8Char::from(self.ljunc).as_bytes())?;
        }
        let mut iter = col_width.iter().peekable();
        while let Some(width) = iter.next() {
            for _ in 0..width + padding.0 + padding.1 {
                out.write_all(Utf8Char::from(self.line).as_bytes())?;
            }
            if colsep && iter.peek().is_some() {
                out.write_all(Utf8Char::from(self.junc).as_bytes())?;
            }
        }
        if rborder {
            out.write_all(Utf8Char::from(self.rjunc).as_bytes())?;
        }
        out.write_all(NEWLINE)?;
        Ok(1)
    }
}

impl Default for LineSeparator {
    fn default() -> Self {
        LineSeparator::new('-', '+', '+', '+')
    }
}

/// Contains the table formatting rules
#[derive(Clone, Debug, Copy, Hash, PartialEq, Eq)]
pub struct TableFormat {
    /// Optional column separator character
    csep: Option<char>,
    /// Optional left border character
    lborder: Option<char>,
    /// Optional right border character
    rborder: Option<char>,
    /// Optional internal line separator
    lsep: Option<LineSeparator>,
    /// Optional title line separator
    tsep: Option<LineSeparator>,
    /// Optional top line separator
    top_sep: Option<LineSeparator>,
    /// Optional bottom line separator
    bottom_sep: Option<LineSeparator>,
    /// Left padding
    pad_left: usize,
    /// Right padding
    pad_right: usize,
    /// Global indentation when rendering the table
    indent: usize,
}

impl TableFormat {
    /// Create a new empty TableFormat.
    pub fn new() -> TableFormat {
        TableFormat {
            csep: None,
            lborder: None,
            rborder: None,
            lsep: None,
            tsep: None,
            top_sep: None,
            bottom_sep: None,
            pad_left: 0,
            pad_right: 0,
            indent: 0,
        }
    }

    /// Return a tuple with left and right padding
    pub fn get_padding(&self) -> (usize, usize) {
        (self.pad_left, self.pad_right)
    }

    /// Set left and right padding
    pub fn padding(&mut self, left: usize, right: usize) {
        self.pad_left = left;
        self.pad_right = right;
    }

    /// Set the character used for internal column separation
    pub fn column_separator(&mut self, separator: char) {
        self.csep = Some(separator);
    }

    /// Set the character used for table borders
    pub fn borders(&mut self, border: char) {
        self.lborder = Some(border);
        self.rborder = Some(border);
    }

    /// Set the character used for left table border
    pub fn left_border(&mut self, border: char) {
        self.lborder = Some(border);
    }

    /// Set the character used for right table border
    pub fn right_border(&mut self, border: char) {
        self.rborder = Some(border);
    }

    /// Set a line separator
    pub fn separator(&mut self, what: LinePosition, separator: LineSeparator) {
        *match what {
            LinePosition::Top => &mut self.top_sep,
            LinePosition::Bottom => &mut self.bottom_sep,
            LinePosition::Title => &mut self.tsep,
            LinePosition::Intern => &mut self.lsep,
        } = Some(separator);
    }

    /// Set format for multiple kind of line separator
    pub fn separators(&mut self, what: &[LinePosition], separator: LineSeparator) {
        for pos in what {
            self.separator(*pos, separator);
        }
    }

    fn get_sep_for_line(&self, pos: LinePosition) -> &Option<LineSeparator> {
        match pos {
            LinePosition::Intern => &self.lsep,
            LinePosition::Top => &self.top_sep,
            LinePosition::Bottom => &self.bottom_sep,
            LinePosition::Title => match &self.tsep {
                s @ &Some(_) => s,
                &None => &self.lsep,
            },
        }
    }

    /// Set global indentation in spaces used when rendering a table
    pub fn indent(&mut self, spaces: usize) {
        self.indent = spaces;
    }

    /// Get global indentation in spaces used when rendering a table
    pub fn get_indent(&self) -> usize {
        self.indent
    }

    /// Print a full line separator to `out`. `col_width` is a slice containing the width of each column.
    /// Returns the number of printed lines
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn print_line_separator<T: Write + ?Sized>(
        &self,
        out: &mut T,
        col_width: &[usize],
        pos: LinePosition,
    ) -> Result<usize, Error> {
        match *self.get_sep_for_line(pos) {
            Some(ref l) => {
                //TODO: Wrap this into dedicated function one day
                out.write_all(&vec![b' '; self.get_indent()])?;
                l.print(
                    out,
                    col_width,
                    self.get_padding(),
                    self.csep.is_some(),
                    self.lborder.is_some(),
                    self.rborder.is_some(),
                )
            }
            None => Ok(0),
        }
    }

    /// Returns the character used to separate columns.
    /// `pos` specify if the separator is left/right final or internal to the table
    pub fn get_column_separator(&self, pos: ColumnPosition) -> Option<char> {
        match pos {
            ColumnPosition::Left => self.lborder,
            ColumnPosition::Intern => self.csep,
            ColumnPosition::Right => self.rborder,
        }
    }

    /// Print a column separator or a table border
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn print_column_separator<T: Write + ?Sized>(
        &self,
        out: &mut T,
        pos: ColumnPosition,
    ) -> Result<(), Error> {
        match self.get_column_separator(pos) {
            Some(s) => out.write_all(Utf8Char::from(s).as_bytes()),
            None => Ok(()),
        }
    }
}

impl Default for TableFormat {
    fn default() -> Self {
        TableFormat::new()
    }
}

/// A builder to create a `TableFormat`
pub struct FormatBuilder {
    format: Box<TableFormat>,
}

impl FormatBuilder {
    /// Creates a new builder
    pub fn new() -> FormatBuilder {
        FormatBuilder {
            format: Box::new(TableFormat::new()),
        }
    }

    /// Set left and right padding
    pub fn padding(mut self, left: usize, right: usize) -> Self {
        self.format.padding(left, right);
        self
    }

    /// Set the character used for internal column separation
    pub fn column_separator(mut self, separator: char) -> Self {
        self.format.column_separator(separator);
        self
    }

    /// Set the character used for table borders
    pub fn borders(mut self, border: char) -> Self {
        self.format.borders(border);
        self
    }

    /// Set the character used for left table border
    pub fn left_border(mut self, border: char) -> Self {
        self.format.left_border(border);
        self
    }

    /// Set the character used for right table border
    pub fn right_border(mut self, border: char) -> Self {
        self.format.right_border(border);
        self
    }

    /// Set a line separator format
    pub fn separator(mut self, what: LinePosition, separator: LineSeparator) -> Self {
        self.format.separator(what, separator);
        self
    }

    /// Set separator format for multiple kind of line separators
    pub fn separators(mut self, what: &[LinePosition], separator: LineSeparator) -> Self {
        self.format.separators(what, separator);
        self
    }

    /// Set global indentation in spaces used when rendering a table
    pub fn indent(mut self, spaces: usize) -> Self {
        self.format.indent(spaces);
        self
    }

    /// Return the generated `TableFormat`
    pub fn build(&self) -> TableFormat {
        *self.format
    }
}

impl Into<TableFormat> for FormatBuilder {
    fn into(self) -> TableFormat {
        *self.format
    }
}

impl From<TableFormat> for FormatBuilder {
    fn from(fmt: TableFormat) -> Self {
        FormatBuilder {
            format: Box::new(fmt),
        }
    }
}

/// Predifined formats. Those constants are lazily evaluated when
/// the corresponding struct is dereferenced
pub mod consts {
    use super::{FormatBuilder, LinePosition, LineSeparator, TableFormat};
    use lazy_static::lazy_static;

    lazy_static! {
        /// A line separator made of `-` and `+`
        static ref MINUS_PLUS_SEP: LineSeparator = LineSeparator::new('-', '+', '+', '+');
        /// A line separator made of `=` and `+`
        static ref EQU_PLUS_SEP: LineSeparator = LineSeparator::new('=', '+', '+', '+');

        /// Default table format
        ///
        /// # Example
        /// ```text
        /// +----+----+
        /// | T1 | T2 |
        /// +====+====+
        /// | a  | b  |
        /// +----+----+
        /// | d  | c  |
        /// +----+----+
        /// ```
        pub static ref FORMAT_DEFAULT: TableFormat = FormatBuilder::new()
                                                                    .column_separator('|')
                                                                    .borders('|')
                                                                    .separator(LinePosition::Intern, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Title, *EQU_PLUS_SEP)
                                                                    .separator(LinePosition::Bottom, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Top, *MINUS_PLUS_SEP)
                                                                    .padding(1, 1)
                                                                    .build();

        /// Similar to `FORMAT_DEFAULT` but without special separator after title line
        ///
        /// # Example
        /// ```text
        /// +----+----+
        /// | T1 | T2 |
        /// +----+----+
        /// | a  | b  |
        /// +----+----+
        /// | c  | d  |
        /// +----+----+
        /// ```
        pub static ref FORMAT_NO_TITLE: TableFormat = FormatBuilder::new()
                                                                    .column_separator('|')
                                                                    .borders('|')
                                                                    .separator(LinePosition::Intern, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Title, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Bottom, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Top, *MINUS_PLUS_SEP)
                                                                    .padding(1, 1)
                                                                    .build();

        /// With no line separator, but with title separator
        ///
        /// # Example
        /// ```text
        /// +----+----+
        /// | T1 | T2 |
        /// +----+----+
        /// | a  | b  |
        /// | c  | d  |
        /// +----+----+
        /// ```
        pub static ref FORMAT_NO_LINESEP_WITH_TITLE: TableFormat = FormatBuilder::new()
                                                                    .column_separator('|')
                                                                    .borders('|')
                                                                    .separator(LinePosition::Title, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Bottom, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Top, *MINUS_PLUS_SEP)
                                                                    .padding(1, 1)
                                                                    .build();

        /// With no line or title separator
        ///
        /// # Example
        /// ```text
        /// +----+----+
        /// | T1 | T2 |
        /// | a  | b  |
        /// | c  | d  |
        /// +----+----+
        /// ```
        pub static ref FORMAT_NO_LINESEP: TableFormat = FormatBuilder::new()
                                                                    .column_separator('|')
                                                                    .borders('|')
                                                                    .separator(LinePosition::Bottom, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Top, *MINUS_PLUS_SEP)
                                                                    .padding(1, 1)
                                                                    .build();

        /// No column separator
        ///
        /// # Example
        /// ```text
        /// --------
        ///  T1  T2
        /// ========
        ///  a   b
        /// --------
        ///  d   c
        /// --------
        /// ```
        pub static ref FORMAT_NO_COLSEP: TableFormat = FormatBuilder::new()
                                                                    .separator(LinePosition::Intern, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Title, *EQU_PLUS_SEP)
                                                                    .separator(LinePosition::Bottom, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Top, *MINUS_PLUS_SEP)
                                                                    .padding(1, 1)
                                                                    .build();

        /// Format for printing a table without any separators (only alignment)
        ///
        /// # Example
        /// ```text
        ///  T1  T2
        ///  a   b
        ///  d   c
        /// ```
        pub static ref FORMAT_CLEAN: TableFormat = FormatBuilder::new()
                                                                    .padding(1, 1)
                                                                    .build();

        /// Format for a table with only external borders and title separator
        ///
        /// # Example
        /// ```text
        /// +--------+
        /// | T1  T2 |
        /// +========+
        /// | a   b  |
        /// | c   d  |
        /// +--------+
        /// ```
        pub static ref FORMAT_BORDERS_ONLY: TableFormat = FormatBuilder::new()
                                                                    .padding(1, 1)
                                                                    .separator(LinePosition::Title, *EQU_PLUS_SEP)
                                                                    .separator(LinePosition::Bottom, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Top, *MINUS_PLUS_SEP)
                                                                    .borders('|')
                                                                    .build();

        /// A table with no external border
        ///
        /// # Example
        /// ```text
        ///  T1 | T2
        /// ====+====
        ///  a  | b
        /// ----+----
        ///  c  | d
        /// ```
        pub static ref FORMAT_NO_BORDER: TableFormat = FormatBuilder::new()
                                                                    .padding(1, 1)
                                                                    .separator(LinePosition::Intern, *MINUS_PLUS_SEP)
                                                                    .separator(LinePosition::Title, *EQU_PLUS_SEP)
                                                                    .column_separator('|')
                                                                    .build();

        /// A table with no external border and no line separation
        ///
        /// # Example
        /// ```text
        ///  T1 | T2
        /// ----+----
        ///  a  | b
        ///  c  | d
        /// ```
        pub static ref FORMAT_NO_BORDER_LINE_SEPARATOR: TableFormat = FormatBuilder::new()
                                                                    .padding(1, 1)
                                                                    .separator(LinePosition::Title, *MINUS_PLUS_SEP)
                                                                    .column_separator('|')
                                                                    .build();

        /// A table with borders and delimiters made with box characters
        ///
        /// # Example
        /// ```text
        /// ┌────┬────┬────┐
        /// │ t1 │ t2 │ t3 │
        /// ├────┼────┼────┤
        /// │ 1  │ 1  │ 1  │
        /// ├────┼────┼────┤
        /// │ 2  │ 2  │ 2  │
        /// └────┴────┴────┘
        /// ```
        pub static ref FORMAT_BOX_CHARS: TableFormat = FormatBuilder::new()
                             .column_separator('│')
                             .borders('│')
                             .separators(&[LinePosition::Top],
                                         LineSeparator::new('─',
                                                            '┬',
                                                            '┌',
                                                            '┐'))
                             .separators(&[LinePosition::Intern],
                                         LineSeparator::new('─',
                                                            '┼',
                                                            '├',
                                                            '┤'))
                             .separators(&[LinePosition::Bottom],
                                         LineSeparator::new('─',
                                                            '┴',
                                                            '└',
                                                            '┘'))
                             .padding(1, 1)
                             .build();
    }
}
