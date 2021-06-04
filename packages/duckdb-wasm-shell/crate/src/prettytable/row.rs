//! This module contains definition of table rows stuff
use std::io::{Error, Write};
use std::iter::FromIterator;
use std::slice::{Iter, IterMut};
// use std::vec::IntoIter;
use std::ops::{Index, IndexMut};

use super::format::{ColumnPosition, TableFormat};
use super::utils::NEWLINE;
use super::Cell;

/// Represent a table row made of cells
#[derive(Clone, Debug, Hash, PartialEq, Eq)]
pub struct Row {
    cells: Vec<Cell>,
}

impl Row {
    /// Create a new `Row` backed with `cells` vector
    pub fn new(cells: Vec<Cell>) -> Row {
        Row { cells }
    }

    /// Create an row of length `size`, with empty strings stored
    pub fn empty() -> Row {
        Self::new(vec![Cell::default(); 0])
    }

    /// Count the number of column required in the table grid.
    /// It takes into account horizontal spanning of cells. For
    /// example, a cell with an hspan of 3 will add 3 column to the grid
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn column_count(&self) -> usize {
        self.cells.iter().map(|c| c.get_hspan()).sum()
    }

    /// Get the number of cells in this row
    pub fn len(&self) -> usize {
        self.cells.len()
        // self.cells.iter().map(|c| c.get_hspan()).sum()
    }

    /// Check if the row is empty (has no cell)
    pub fn is_empty(&self) -> bool {
        self.cells.is_empty()
    }

    /// Get the height of this row
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    fn get_height(&self) -> usize {
        let mut height = 1; // Minimum height must be 1 to print empty rows
        for cell in &self.cells {
            let h = cell.get_height();
            if h > height {
                height = h;
            }
        }
        height
    }

    /// Get the minimum width required by the cell in the column `column`.
    /// Return 0 if the cell does not exist in this row
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn get_column_width(&self, column: usize, format: &TableFormat) -> usize {
        let mut i = 0;
        for c in &self.cells {
            if i + c.get_hspan() > column {
                if c.get_hspan() == 1 {
                    return c.get_width();
                }
                let (lp, rp) = format.get_padding();
                let sep = format
                    .get_column_separator(ColumnPosition::Intern)
                    .map(|_| 1)
                    .unwrap_or_default();
                let rem = lp + rp + sep;
                let mut w = c.get_width();
                if w > rem {
                    w -= rem;
                } else {
                    w = 0;
                }
                return (w as f64 / c.get_hspan() as f64).ceil() as usize;
            }
            i += c.get_hspan();
        }
        0
    }

    /// Get the cell at index `idx`
    pub fn get_cell(&self, idx: usize) -> Option<&Cell> {
        self.cells.get(idx)
    }

    /// Get the mutable cell at index `idx`
    pub fn get_mut_cell(&mut self, idx: usize) -> Option<&mut Cell> {
        self.cells.get_mut(idx)
    }

    /// Set the `cell` in the row at the given `idx` index
    pub fn set_cell(&mut self, cell: Cell, idx: usize) -> Result<(), &str> {
        if idx >= self.len() {
            return Err("Cannot find cell");
        }
        self.cells[idx] = cell;
        Ok(())
    }

    /// Append a `cell` at the end of the row
    pub fn add_cell(&mut self, cell: Cell) {
        self.cells.push(cell);
    }

    /// Insert `cell` at position `index`. If `index` is higher than the row length,
    /// the cell will be appended at the end
    pub fn insert_cell(&mut self, index: usize, cell: Cell) {
        if index < self.cells.len() {
            self.cells.insert(index, cell);
        } else {
            self.add_cell(cell);
        }
    }

    /// Remove the cell at position `index`. Silently skip if this cell does not exist
    pub fn remove_cell(&mut self, index: usize) {
        if index < self.cells.len() {
            self.cells.remove(index);
        }
    }

    /// Returns an immutable iterator over cells
    pub fn iter(&self) -> Iter<Cell> {
        self.cells.iter()
    }

    /// Returns an mutable iterator over cells
    pub fn iter_mut(&mut self) -> IterMut<Cell> {
        self.cells.iter_mut()
    }

    /// Internal only
    fn __print<T: Write + ?Sized, F>(
        &self,
        out: &mut T,
        format: &TableFormat,
        col_width: &[usize],
        f: F,
    ) -> Result<usize, Error>
    where
        F: Fn(&Cell, &mut T, usize, usize, bool) -> Result<(), Error>,
    {
        let height = self.get_height();
        for i in 0..height {
            //TODO: Wrap this into dedicated function one day
            out.write_all(&vec![b' '; format.get_indent()])?;
            format.print_column_separator(out, ColumnPosition::Left)?;
            let (lp, rp) = format.get_padding();
            let mut j = 0;
            let mut hspan = 0; // The additional offset caused by cell's horizontal spanning
            while j + hspan < col_width.len() {
                out.write_all(&vec![b' '; lp])?; // Left padding
                                                 // skip_r_fill skip filling the end of the last cell if there's no character
                                                 // delimiting the end of the table
                let skip_r_fill = (j == col_width.len() - 1)
                    && format.get_column_separator(ColumnPosition::Right).is_none();
                match self.get_cell(j) {
                    Some(c) => {
                        // In case of horizontal spanning, width is the sum of all spanned columns' width
                        let mut w = col_width[j + hspan..j + hspan + c.get_hspan()].iter().sum();
                        let real_span = c.get_hspan() - 1;
                        w += real_span * (lp + rp)
                            + real_span
                                * format
                                    .get_column_separator(ColumnPosition::Intern)
                                    .map(|_| 1)
                                    .unwrap_or_default();
                        // Print cell content
                        f(c, out, i, w, skip_r_fill)?;
                        hspan += real_span; // Add span to offset
                    }
                    None => f(&Cell::default(), out, i, col_width[j + hspan], skip_r_fill)?,
                };
                out.write_all(&vec![b' '; rp])?; // Right padding
                if j + hspan < col_width.len() - 1 {
                    format.print_column_separator(out, ColumnPosition::Intern)?;
                }
                j += 1;
            }
            format.print_column_separator(out, ColumnPosition::Right)?;
            out.write_all(NEWLINE)?;
        }
        Ok(height)
    }

    /// Print the row to `out`, with `separator` as column separator, and `col_width`
    /// specifying the width of each columns. Returns the number of printed lines
    // #[deprecated(since="0.8.0", note="Will become private in future release. See [issue #87](https://github.com/phsym/prettytable-rs/issues/87)")]
    pub(crate) fn print<T: Write + ?Sized>(
        &self,
        out: &mut T,
        format: &TableFormat,
        col_width: &[usize],
    ) -> Result<usize, Error> {
        self.__print(out, format, col_width, Cell::print)
    }
}

impl Default for Row {
    fn default() -> Row {
        Row::empty()
    }
}

impl Index<usize> for Row {
    type Output = Cell;
    fn index(&self, idx: usize) -> &Self::Output {
        &self.cells[idx]
    }
}

impl IndexMut<usize> for Row {
    fn index_mut(&mut self, idx: usize) -> &mut Self::Output {
        &mut self.cells[idx]
    }
}

impl<A: ToString> FromIterator<A> for Row {
    fn from_iter<T>(iterator: T) -> Row
    where
        T: IntoIterator<Item = A>,
    {
        Self::new(iterator.into_iter().map(|ref e| Cell::from(e)).collect())
    }
}

impl<T, A> From<T> for Row
where
    A: ToString,
    T: IntoIterator<Item = A>,
{
    fn from(it: T) -> Row {
        Self::from_iter(it)
    }
}

impl<'a> IntoIterator for &'a Row {
    type Item = &'a Cell;
    type IntoIter = Iter<'a, Cell>;
    fn into_iter(self) -> Self::IntoIter {
        self.iter()
    }
}

// impl IntoIterator for Row {
//     type Item = Cell;
//     type IntoIter = IntoIter<Cell>;
//     fn into_iter(self) -> Self::IntoIter {
//         self.cells.into_iter()
//     }
// }

impl<'a> IntoIterator for &'a mut Row {
    type Item = &'a mut Cell;
    type IntoIter = IterMut<'a, Cell>;
    fn into_iter(self) -> Self::IntoIter {
        self.iter_mut()
    }
}

impl<S: ToString> Extend<S> for Row {
    fn extend<T: IntoIterator<Item = S>>(&mut self, iter: T) {
        self.cells
            .extend(iter.into_iter().map(|s| Cell::new(&s.to_string())));
    }
}

// impl <S: Into<Cell>> Extend<S> for Row {
//     fn extend<T: IntoIterator<Item=S>>(&mut self, iter: T) {
//         self.cells.extend(iter.into_iter().map(|s| s.into()));
//     }
// }

/// This macro simplifies `Row` creation
/// For details about style specifier syntax, check doc for [`Cell::style_spec`](cell/struct.Cell.html#method.style_spec) method
#[macro_export]
macro_rules! row {
    (($($out:tt)*);) => (vec![$($out)*]);
    (($($out:tt)*); $value:expr) => (vec![$($out)* $crate::cell!($value)]);
    (($($out:tt)*); $value:expr, $($n:tt)*) => ($crate::row!(($($out)* $crate::cell!($value),); $($n)*));
    (($($out:tt)*); $style:ident -> $value:expr) => (vec![$($out)* $crate::cell!($style -> $value)]);
    (($($out:tt)*); $style:ident -> $value:expr, $($n: tt)*) => ($crate::row!(($($out)* $crate::cell!($style -> $value),); $($n)*));

    ($($content:expr), *) => ($crate::Row::new(vec![$($crate::cell!($content)), *])); // This line may not be needed starting from Rust 1.20
    ($style:ident => $($content:expr), *) => ($crate::Row::new(vec![$($crate::cell!($style -> $content)), *]));
    ($style:ident => $($content:expr,) *) => ($crate::Row::new(vec![$($crate::cell!($style -> $content)), *]));
    ($($content:tt)*) => ($crate::Row::new($crate::row!((); $($content)*)));
}

#[cfg(test)]
mod tests {
    use super::*;
    use Cell;

    #[test]
    fn row_default_empty() {
        let row1 = Row::default();
        assert_eq!(row1.len(), 0);
        assert!(row1.is_empty());
    }

    #[test]
    fn get_add_set_cell() {
        let mut row = Row::from(vec!["foo", "bar", "foobar"]);
        assert_eq!(row.len(), 3);
        assert!(row.get_mut_cell(12).is_none());
        let c1 = row.get_mut_cell(0).unwrap().clone();
        assert_eq!(c1.get_content(), "foo");

        let c1 = Cell::from(&"baz");
        assert!(row.set_cell(c1.clone(), 1000).is_err());
        assert!(row.set_cell(c1.clone(), 0).is_ok());
        assert_eq!(row.get_cell(0).unwrap().get_content(), "baz");

        row.add_cell(c1.clone());
        assert_eq!(row.len(), 4);
        assert_eq!(row.get_cell(3).unwrap().get_content(), "baz");
    }

    #[test]
    fn insert_cell() {
        let mut row = Row::from(vec!["foo", "bar", "foobar"]);
        assert_eq!(row.len(), 3);
        let cell = Cell::new("baz");
        row.insert_cell(1000, cell.clone());
        assert_eq!(row.len(), 4);
        assert_eq!(row.get_cell(3).unwrap().get_content(), "baz");
        row.insert_cell(1, cell.clone());
        assert_eq!(row.len(), 5);
        assert_eq!(row.get_cell(1).unwrap().get_content(), "baz");
    }

    #[test]
    fn remove_cell() {
        let mut row = Row::from(vec!["foo", "bar", "foobar"]);
        assert_eq!(row.len(), 3);
        row.remove_cell(1000);
        assert_eq!(row.len(), 3);
        row.remove_cell(1);
        assert_eq!(row.len(), 2);
        assert_eq!(row.get_cell(0).unwrap().get_content(), "foo");
        assert_eq!(row.get_cell(1).unwrap().get_content(), "foobar");
    }

    #[test]
    fn extend_row() {
        let mut row = Row::from(vec!["foo", "bar", "foobar"]);
        row.extend(vec!["A", "B", "C"]);
        assert_eq!(row.len(), 6);
        assert_eq!(row.get_cell(3).unwrap().get_content(), "A");
        assert_eq!(row.get_cell(4).unwrap().get_content(), "B");
        assert_eq!(row.get_cell(5).unwrap().get_content(), "C");
    }
}
