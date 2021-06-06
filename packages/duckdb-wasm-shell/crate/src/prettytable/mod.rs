use std::fmt;
use std::io::{Error, Write};
use std::iter::{FromIterator, IntoIterator};
use std::ops::{Index, IndexMut};
use std::slice::{Iter, IterMut};

mod cell;
pub mod format;
mod row;
mod utils;

pub use cell::Cell;
use format::{consts, LinePosition, TableFormat};
pub use row::Row;
use utils::StringWriter;

/// An owned printable table
#[derive(Clone, Debug, Hash, PartialEq, Eq)]
pub struct Table {
    format: Box<TableFormat>,
    titles: Box<Option<Row>>,
    rows: Vec<Row>,
}

/// A borrowed immutable `Table` slice
/// A `TableSlice` is obtained by slicing a `Table` with the `Slice::slice` method.
#[derive(Clone, Debug, Hash, PartialEq, Eq)]
pub struct TableSlice<'a> {
    format: &'a TableFormat,
    titles: &'a Option<Row>,
    rows: &'a [Row],
}

impl<'a> TableSlice<'a> {
    /// Compute and return the number of column
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    fn get_column_num(&self) -> usize {
        let mut cnum = 0;
        for r in self.rows {
            let l = r.column_count();
            if l > cnum {
                cnum = l;
            }
        }
        cnum
    }

    /// Get the number of rows
    pub fn len(&self) -> usize {
        self.rows.len()
    }

    /// Check if the table slice is empty
    pub fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }

    /// Get an immutable reference to a row
    pub fn get_row(&self, row: usize) -> Option<&Row> {
        self.rows.get(row)
    }

    /// Get the width of the column at position `col_idx`.
    /// Return 0 if the column does not exists;
    fn get_column_width(&self, col_idx: usize) -> usize {
        let mut width = match *self.titles {
            Some(ref t) => t.get_column_width(col_idx, self.format),
            None => 0,
        };
        for r in self.rows {
            let l = r.get_column_width(col_idx, self.format);
            if l > width {
                width = l;
            }
        }
        width
    }

    /// Get the width of all columns, and return a slice
    /// with the result for each column
    fn get_all_column_width(&self) -> Vec<usize> {
        let colnum = self.get_column_num();
        let mut col_width = vec![0usize; colnum];
        for i in 0..colnum {
            // TODO: calling "get_column_width()" in a loop is inefficient
            col_width[i] = self.get_column_width(i);
        }
        col_width
    }

    /// Returns an iterator over the immutable cells of the column specified by `column`
    pub fn column_iter(&self, column: usize) -> ColumnIter {
        ColumnIter(self.rows.iter(), column)
    }

    /// Returns an iterator over immutable rows
    pub fn row_iter(&self) -> Iter<Row> {
        self.rows.iter()
    }

    /// Internal only
    fn __print<T: Write + ?Sized, F>(&self, out: &mut T, f: F) -> Result<usize, Error>
    where
        F: Fn(&Row, &mut T, &TableFormat, &[usize]) -> Result<usize, Error>,
    {
        let mut height = 0;
        // Compute columns width
        let col_width = self.get_all_column_width();
        height += self
            .format
            .print_line_separator(out, &col_width, LinePosition::Top)?;
        if let Some(ref t) = *self.titles {
            height += f(t, out, self.format, &col_width)?;
            height += self
                .format
                .print_line_separator(out, &col_width, LinePosition::Title)?;
        }
        // Print rows
        let mut iter = self.rows.iter().peekable();
        while let Some(r) = iter.next() {
            height += f(r, out, self.format, &col_width)?;
            if iter.peek().is_some() {
                height +=
                    self.format
                        .print_line_separator(out, &col_width, LinePosition::Intern)?;
            }
        }
        height += self
            .format
            .print_line_separator(out, &col_width, LinePosition::Bottom)?;
        out.flush()?;
        Ok(height)
    }

    /// Print the table to `out` and returns the number of
    /// line printed, or an error
    pub fn print<T: Write + ?Sized>(&self, out: &mut T) -> Result<usize, Error> {
        self.__print(out, Row::print)
    }
}

impl<'a> IntoIterator for &'a TableSlice<'a> {
    type Item = &'a Row;
    type IntoIter = Iter<'a, Row>;
    fn into_iter(self) -> Self::IntoIter {
        self.row_iter()
    }
}

impl Table {
    /// Create an empty table
    pub fn new() -> Table {
        Self::init(Vec::new())
    }

    /// Create a table initialized with `rows`
    pub fn init(rows: Vec<Row>) -> Table {
        Table {
            rows,
            titles: Box::new(None),
            format: Box::new(*consts::FORMAT_DEFAULT),
        }
    }

    /// Change the table format. Eg : Separators
    pub fn set_format(&mut self, format: TableFormat) {
        *self.format = format;
    }

    /// Get a mutable reference to the internal format
    pub fn get_format(&mut self) -> &mut TableFormat {
        &mut self.format
    }

    /// Compute and return the number of column
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    #[cfg(test)] // Only used for testing for now
    pub(crate) fn get_column_num(&self) -> usize {
        self.as_ref().get_column_num()
    }

    /// Get the number of rows
    pub fn len(&self) -> usize {
        self.rows.len()
    }

    /// Check if the table is empty
    pub fn is_empty(&self) -> bool {
        self.rows.is_empty()
    }

    /// Set the optional title lines
    pub fn set_titles(&mut self, titles: Row) {
        *self.titles = Some(titles);
    }

    /// Unset the title line
    pub fn unset_titles(&mut self) {
        *self.titles = None;
    }

    /// Get a mutable reference to a row
    pub fn get_mut_row(&mut self, row: usize) -> Option<&mut Row> {
        self.rows.get_mut(row)
    }

    /// Get an immutable reference to a row
    pub fn get_row(&self, row: usize) -> Option<&Row> {
        self.rows.get(row)
    }

    /// Append a row in the table, transferring ownership of this row to the table
    /// and returning a mutable reference to the row
    pub fn add_row(&mut self, row: Row) -> &mut Row {
        self.rows.push(row);
        let l = self.rows.len() - 1;
        &mut self.rows[l]
    }

    /// Append an empty row in the table. Return a mutable reference to this new row.
    pub fn add_empty_row(&mut self) -> &mut Row {
        self.add_row(Row::default())
    }

    /// Insert `row` at the position `index`, and return a mutable reference to this row.
    /// If index is higher than current numbers of rows, `row` is appended at the end of the table
    pub fn insert_row(&mut self, index: usize, row: Row) -> &mut Row {
        if index < self.rows.len() {
            self.rows.insert(index, row);
            &mut self.rows[index]
        } else {
            self.add_row(row)
        }
    }

    /// Modify a single element in the table
    pub fn set_element(&mut self, element: &str, column: usize, row: usize) -> Result<(), &str> {
        let rowline = self.get_mut_row(row).ok_or("Cannot find row")?;
        // TODO: If a cell already exist, copy it's alignment parameter
        rowline.set_cell(Cell::new(element), column)
    }

    /// Remove the row at position `index`. Silently skip if the row does not exist
    pub fn remove_row(&mut self, index: usize) {
        if index < self.rows.len() {
            self.rows.remove(index);
        }
    }

    /// Return an iterator over the immutable cells of the column specified by `column`
    pub fn column_iter(&self, column: usize) -> ColumnIter {
        ColumnIter(self.rows.iter(), column)
    }

    /// Return an iterator over the mutable cells of the column specified by `column`
    pub fn column_iter_mut(&mut self, column: usize) -> ColumnIterMut {
        ColumnIterMut(self.rows.iter_mut(), column)
    }

    /// Returns an iterator over immutable rows
    pub fn row_iter(&self) -> Iter<Row> {
        self.rows.iter()
    }

    /// Returns an iterator over mutable rows
    pub fn row_iter_mut(&mut self) -> IterMut<Row> {
        self.rows.iter_mut()
    }

    /// Print the table to `out` and returns the number
    /// of lines printed, or an error
    pub fn print<T: Write + ?Sized>(&self, out: &mut T) -> Result<usize, Error> {
        self.as_ref().print(out)
    }
}

impl Index<usize> for Table {
    type Output = Row;
    fn index(&self, idx: usize) -> &Self::Output {
        &self.rows[idx]
    }
}

impl<'a> Index<usize> for TableSlice<'a> {
    type Output = Row;
    fn index(&self, idx: usize) -> &Self::Output {
        &self.rows[idx]
    }
}

impl IndexMut<usize> for Table {
    fn index_mut(&mut self, idx: usize) -> &mut Self::Output {
        &mut self.rows[idx]
    }
}

impl fmt::Display for Table {
    fn fmt(&self, fmt: &mut fmt::Formatter) -> Result<(), fmt::Error> {
        self.as_ref().fmt(fmt)
    }
}

impl<'a> fmt::Display for TableSlice<'a> {
    fn fmt(&self, fmt: &mut fmt::Formatter) -> Result<(), fmt::Error> {
        let mut writer = StringWriter::new();
        if self.print(&mut writer).is_err() {
            return Err(fmt::Error);
        }
        fmt.write_str(writer.as_string())
    }
}

impl<B: ToString, A: IntoIterator<Item = B>> FromIterator<A> for Table {
    fn from_iter<T>(iterator: T) -> Table
    where
        T: IntoIterator<Item = A>,
    {
        Self::init(iterator.into_iter().map(Row::from).collect())
    }
}

impl FromIterator<Row> for Table {
    fn from_iter<T>(iterator: T) -> Table
    where
        T: IntoIterator<Item = Row>,
    {
        Self::init(iterator.into_iter().collect())
    }
}

impl<T, A, B> From<T> for Table
where
    B: ToString,
    A: IntoIterator<Item = B>,
    T: IntoIterator<Item = A>,
{
    fn from(it: T) -> Table {
        Self::from_iter(it)
    }
}

impl<'a> IntoIterator for &'a Table {
    type Item = &'a Row;
    type IntoIter = Iter<'a, Row>;
    fn into_iter(self) -> Self::IntoIter {
        self.as_ref().row_iter()
    }
}

impl<'a> IntoIterator for &'a mut Table {
    type Item = &'a mut Row;
    type IntoIter = IterMut<'a, Row>;
    fn into_iter(self) -> Self::IntoIter {
        self.row_iter_mut()
    }
}

// impl IntoIterator for Table {
//     type Item = Row;
//     type IntoIter = std::vec::IntoIter<Self::Item>;
//     fn into_iter(self) -> Self::IntoIter {
//         self.rows.into_iter()
//     }
// }

impl<A: Into<Row>> Extend<A> for Table {
    fn extend<T: IntoIterator<Item = A>>(&mut self, iter: T) {
        self.rows.extend(iter.into_iter().map(|r| r.into()));
    }
}

/// Iterator over immutable cells in a column
pub struct ColumnIter<'a>(Iter<'a, Row>, usize);

impl<'a> Iterator for ColumnIter<'a> {
    type Item = &'a Cell;
    fn next(&mut self) -> Option<&'a Cell> {
        self.0.next().and_then(|row| row.get_cell(self.1))
    }
}

/// Iterator over mutable cells in a column
pub struct ColumnIterMut<'a>(IterMut<'a, Row>, usize);

impl<'a> Iterator for ColumnIterMut<'a> {
    type Item = &'a mut Cell;
    fn next(&mut self) -> Option<&'a mut Cell> {
        self.0.next().and_then(|row| row.get_mut_cell(self.1))
    }
}

impl<'a> AsRef<TableSlice<'a>> for TableSlice<'a> {
    fn as_ref(&self) -> &TableSlice<'a> {
        self
    }
}

impl<'a> AsRef<TableSlice<'a>> for Table {
    fn as_ref(&self) -> &TableSlice<'a> {
        unsafe {
            // All this is a bit hacky. Let's try to find something else
            let s = &mut *((self as *const Table) as *mut Table);
            s.rows.shrink_to_fit();
            &*(self as *const Table as *const TableSlice<'a>)
        }
    }
}

/// Trait implemented by types which can be sliced
pub trait Slice<'a, E> {
    /// Type output after slicing
    type Output: 'a;
    /// Get a slice from self
    fn slice(&'a self, arg: E) -> Self::Output;
}

impl<'a, T, E> Slice<'a, E> for T
where
    T: AsRef<TableSlice<'a>>,
    [Row]: Index<E, Output = [Row]>,
{
    type Output = TableSlice<'a>;
    fn slice(&'a self, arg: E) -> Self::Output {
        let sl = self.as_ref();
        TableSlice {
            format: sl.format,
            titles: sl.titles,
            rows: sl.rows.index(arg),
        }
    }
}

/// Create a table filled with some values
///
/// For details about style specifier syntax, check doc for [`Cell::style_spec`](cell/struct.Cell.html#method.style_spec) method
#[macro_export]
macro_rules! table {
($([$($content:tt)*]), *) => (
    $crate::Table::init(vec![$($crate::row![$($content)*]), *])
);
}

/// Create a table with `table!` macro, print it to standard output, then return this table for future usage.
///
/// The syntax is the same that the one for the `table!` macro
#[macro_export]
macro_rules! ptable {
($($content:tt)*) => (
    {
        let tab = $crate::table!($($content)*);
        tab.printstd();
        tab
    }
);
}

#[cfg(test)]
mod tests {
    use super::utils::StringWriter;
    use super::{format, Cell, Row, Slice, Table};
    use format::consts::{FORMAT_BOX_CHARS, FORMAT_CLEAN, FORMAT_DEFAULT, FORMAT_NO_LINESEP};

    #[test]
    fn table() {
        let mut table = Table::new();
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        let out = "\
+-----+----+-----+
| t1  | t2 | t3  |
+=====+====+=====+
| a   | bc | def |
+-----+----+-----+
| def | bc | a   |
+-----+----+-----+
";
        assert_eq!(table.to_string().replace("\r\n", "\n"), out);
        assert_eq!(7, table.print(&mut StringWriter::new()).unwrap());
        table.unset_titles();
        let out = "\
+-----+----+-----+
| a   | bc | def |
+-----+----+-----+
| def | bc | a   |
+-----+----+-----+
";
        assert_eq!(table.to_string().replace("\r\n", "\n"), out);
        assert_eq!(5, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn index() {
        let mut table = Table::new();
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        assert_eq!(table[1][1].get_content(), "bc");

        table[1][1] = Cell::new("newval");
        assert_eq!(table[1][1].get_content(), "newval");

        let out = "\
+-----+--------+-----+
| t1  | t2     | t3  |
+=====+========+=====+
| a   | bc     | def |
+-----+--------+-----+
| def | newval | a   |
+-----+--------+-----+
";
        assert_eq!(table.to_string().replace("\r\n", "\n"), out);
        assert_eq!(7, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn table_size() {
        let mut table = Table::new();
        assert!(table.is_empty());
        assert!(table.as_ref().is_empty());
        assert_eq!(table.len(), 0);
        assert_eq!(table.as_ref().len(), 0);
        assert_eq!(table.get_column_num(), 0);
        assert_eq!(table.as_ref().get_column_num(), 0);
        table.add_empty_row();
        assert!(!table.is_empty());
        assert!(!table.as_ref().is_empty());
        assert_eq!(table.len(), 1);
        assert_eq!(table.as_ref().len(), 1);
        assert_eq!(table.get_column_num(), 0);
        assert_eq!(table.as_ref().get_column_num(), 0);
        table[0].add_cell(Cell::default());
        assert_eq!(table.get_column_num(), 1);
        assert_eq!(table.as_ref().get_column_num(), 1);
    }

    #[test]
    fn get_row() {
        let mut table = Table::new();
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        assert!(table.get_row(12).is_none());
        assert!(table.get_row(1).is_some());
        assert_eq!(table.get_row(1).unwrap()[0].get_content(), "def");
        assert!(table.get_mut_row(12).is_none());
        assert!(table.get_mut_row(1).is_some());
        table.get_mut_row(1).unwrap().add_cell(Cell::new("z"));
        assert_eq!(table.get_row(1).unwrap()[3].get_content(), "z");
    }

    #[test]
    fn add_empty_row() {
        let mut table = Table::new();
        assert_eq!(table.len(), 0);
        table.add_empty_row();
        assert_eq!(table.len(), 1);
        assert_eq!(table[0].len(), 0);
    }

    #[test]
    fn remove_row() {
        let mut table = Table::new();
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.remove_row(12);
        assert_eq!(table.len(), 2);
        table.remove_row(0);
        assert_eq!(table.len(), 1);
        assert_eq!(table[0][0].get_content(), "def");
    }

    #[test]
    fn insert_row() {
        let mut table = Table::new();
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.insert_row(
            12,
            Row::new(vec![Cell::new("1"), Cell::new("2"), Cell::new("3")]),
        );
        assert_eq!(table.len(), 3);
        assert_eq!(table[2][1].get_content(), "2");
        table.insert_row(
            1,
            Row::new(vec![Cell::new("3"), Cell::new("4"), Cell::new("5")]),
        );
        assert_eq!(table.len(), 4);
        assert_eq!(table[1][1].get_content(), "4");
        assert_eq!(table[2][1].get_content(), "bc");
    }

    #[test]
    fn set_element() {
        let mut table = Table::new();
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        assert!(table.set_element("foo", 12, 12).is_err());
        assert!(table.set_element("foo", 1, 1).is_ok());
        assert_eq!(table[1][1].get_content(), "foo");
    }

    #[test]
    fn no_linesep() {
        let mut table = Table::new();
        table.set_format(*FORMAT_NO_LINESEP);
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        assert_eq!(table[1][1].get_content(), "bc");

        table[1][1] = Cell::new("newval");
        assert_eq!(table[1][1].get_content(), "newval");

        let out = "\
+-----+--------+-----+
| t1  | t2     | t3  |
| a   | bc     | def |
| def | newval | a   |
+-----+--------+-----+
";
        assert_eq!(table.to_string().replace("\r\n", "\n"), out);
        assert_eq!(5, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn clean() {
        let mut table = Table::new();
        table.set_format(*FORMAT_CLEAN);
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        assert_eq!(table[1][1].get_content(), "bc");

        table[1][1] = Cell::new("newval");
        assert_eq!(table[1][1].get_content(), "newval");

        let out = "\
\u{0020}t1   t2      t3 \n\
\u{0020}a    bc      def \n\
\u{0020}def  newval  a \n\
";
        println!("{}", out);
        println!("____");
        println!("{}", table.to_string().replace("\r\n", "\n"));
        assert_eq!(out, table.to_string().replace("\r\n", "\n"));
        assert_eq!(3, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn padding() {
        let mut table = Table::new();
        let mut format = *FORMAT_DEFAULT;
        format.padding(2, 2);
        table.set_format(format);
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        assert_eq!(table[1][1].get_content(), "bc");

        table[1][1] = Cell::new("newval");
        assert_eq!(table[1][1].get_content(), "newval");

        let out = "\
+-------+----------+-------+
|  t1   |  t2      |  t3   |
+=======+==========+=======+
|  a    |  bc      |  def  |
+-------+----------+-------+
|  def  |  newval  |  a    |
+-------+----------+-------+
";
        println!("{}", out);
        println!("____");
        println!("{}", table.to_string().replace("\r\n", "\n"));
        assert_eq!(out, table.to_string().replace("\r\n", "\n"));
        assert_eq!(7, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn indent() {
        let mut table = Table::new();
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def"),
            Cell::new("bc"),
            Cell::new("a"),
        ]));
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        table.get_format().indent(8);
        let out = "        +-----+----+-----+
        | t1  | t2 | t3  |
        +=====+====+=====+
        | a   | bc | def |
        +-----+----+-----+
        | def | bc | a   |
        +-----+----+-----+
";
        assert_eq!(table.to_string().replace("\r\n", "\n"), out);
        assert_eq!(7, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn slices() {
        let mut table = Table::new();
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("0"),
            Cell::new("0"),
            Cell::new("0"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("1"),
            Cell::new("1"),
            Cell::new("1"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("2"),
            Cell::new("2"),
            Cell::new("2"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("3"),
            Cell::new("3"),
            Cell::new("3"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("4"),
            Cell::new("4"),
            Cell::new("4"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("5"),
            Cell::new("5"),
            Cell::new("5"),
        ]));
        let out = "\
+----+----+----+
| t1 | t2 | t3 |
+====+====+====+
| 1  | 1  | 1  |
+----+----+----+
| 2  | 2  | 2  |
+----+----+----+
| 3  | 3  | 3  |
+----+----+----+
";
        let slice = table.slice(..);
        let slice = slice.slice(1..);
        let slice = slice.slice(..3);
        assert_eq!(out, slice.to_string().replace("\r\n", "\n"));
        assert_eq!(9, slice.print(&mut StringWriter::new()).unwrap());
        assert_eq!(out, table.slice(1..4).to_string().replace("\r\n", "\n"));
        assert_eq!(
            9,
            table.slice(1..4).print(&mut StringWriter::new()).unwrap()
        );
    }

    #[test]
    fn test_unicode_separators() {
        let mut table = Table::new();
        table.set_format(*FORMAT_BOX_CHARS);
        table.add_row(Row::new(vec![
            Cell::new("1"),
            Cell::new("1"),
            Cell::new("1"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("2"),
            Cell::new("2"),
            Cell::new("2"),
        ]));
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2"),
            Cell::new("t3"),
        ]));
        let out = "\
┌────┬────┬────┐
│ t1 │ t2 │ t3 │
├────┼────┼────┤
│ 1  │ 1  │ 1  │
├────┼────┼────┤
│ 2  │ 2  │ 2  │
└────┴────┴────┘
";
        println!("{}", out);
        println!("____");
        println!("{}", table.to_string().replace("\r\n", "\n"));
        assert_eq!(out, table.to_string().replace("\r\n", "\n"));
        assert_eq!(7, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn test_readme_format() {
        // The below is lifted from the README

        let mut table = Table::new();
        let format = format::FormatBuilder::new()
            .column_separator('|')
            .borders('|')
            .separators(
                &[format::LinePosition::Top, format::LinePosition::Bottom],
                format::LineSeparator::new('-', '+', '+', '+'),
            )
            .padding(1, 1)
            .build();
        table.set_format(format);

        table.set_titles(Row::new(vec![Cell::new("Title 1"), Cell::new("Title 2")]));
        table.add_row(Row::new(vec![Cell::new("Value 1"), Cell::new("Value 2")]));
        table.add_row(Row::new(vec![
            Cell::new("Value three"),
            Cell::new("Value four"),
        ]));

        let out = "\
+-------------+------------+
| Title 1     | Title 2    |
| Value 1     | Value 2    |
| Value three | Value four |
+-------------+------------+
";

        println!("{}", out);
        println!("____");
        println!("{}", table.to_string().replace("\r\n", "\n"));
        assert_eq!(out, table.to_string().replace("\r\n", "\n"));
        assert_eq!(5, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn test_readme_format_with_title() {
        let mut table = Table::new();
        table.set_format(*format::consts::FORMAT_NO_LINESEP_WITH_TITLE);

        table.set_titles(Row::new(vec![Cell::new("Title 1"), Cell::new("Title 2")]));
        table.add_row(Row::new(vec![Cell::new("Value 1"), Cell::new("Value 2")]));
        table.add_row(Row::new(vec![
            Cell::new("Value three"),
            Cell::new("Value four"),
        ]));

        let out = "\
+-------------+------------+
| Title 1     | Title 2    |
+-------------+------------+
| Value 1     | Value 2    |
| Value three | Value four |
+-------------+------------+
";
        println!("{}", out);
        println!("____");
        println!("{}", table.to_string().replace("\r\n", "\n"));
        assert_eq!(out, table.to_string().replace("\r\n", "\n"));
        assert_eq!(6, table.print(&mut StringWriter::new()).unwrap());
    }

    #[test]
    fn test_horizontal_span() {
        let mut table = Table::new();
        table.set_titles(Row::new(vec![
            Cell::new("t1"),
            Cell::new("t2").with_hspan(2),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("a"),
            Cell::new("bc"),
            Cell::new("def"),
        ]));
        table.add_row(Row::new(vec![
            Cell::new("def").style_spec("H02c"),
            Cell::new("a"),
        ]));
        let out = "\
+----+----+-----+
| t1 | t2       |
+====+====+=====+
| a  | bc | def |
+----+----+-----+
|   def   | a   |
+----+----+-----+
";
        println!("{}", out);
        println!("____");
        println!("{}", table.to_string().replace("\r\n", "\n"));
        assert_eq!(out, table.to_string().replace("\r\n", "\n"));
        assert_eq!(7, table.print(&mut StringWriter::new()).unwrap());
    }
}
