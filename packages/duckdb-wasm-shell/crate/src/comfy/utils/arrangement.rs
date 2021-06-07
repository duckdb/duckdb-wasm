use std::collections::BTreeMap;

use super::borders::{
    should_draw_left_border, should_draw_right_border, should_draw_vertical_lines,
};
use super::column_display_info::ColumnDisplayInfo;

use super::super::style::ColumnConstraint::*;
use super::super::style::{ColumnConstraint, ContentArrangement};
use super::super::table::Table;

/// Determine the width of each column depending on the content of the given table.
/// The results uses Option<usize>, since users can choose to hide columns.
pub(crate) fn arrange_content(table: &Table) -> Vec<ColumnDisplayInfo> {
    let table_width = table.get_table_width();
    let mut display_infos = Vec::new();
    for column in table.columns.iter() {
        let mut info = ColumnDisplayInfo::new(column);

        if let Some(constraint) = column.constraint {
            evaluate_constraint(&mut info, constraint, table_width);
        }

        display_infos.push(info);
    }

    // Fallback to Disabled, if we don't have any information on how wide the table should be.
    if table_width.is_none() {
        disabled_arrangement(&mut display_infos);
        return display_infos;
    }

    match &table.arrangement {
        ContentArrangement::Disabled => disabled_arrangement(&mut display_infos),
        ContentArrangement::Dynamic | ContentArrangement::DynamicFullWidth => {
            dynamic_arrangement(table, &mut display_infos, table_width.unwrap());
        }
    }

    display_infos
}

/// Look at given constraints of a column and populate the ColumnDisplayInfo depending on those.
fn evaluate_constraint(
    info: &mut ColumnDisplayInfo,
    constraint: ColumnConstraint,
    table_width: Option<u16>,
) {
    match constraint {
        ContentWidth => {
            info.set_content_width(info.max_content_width);
            info.fixed = true;
        }
        Width(width) => {
            let width = info.without_padding(width);
            info.set_content_width(width);
            info.fixed = true;
        }
        MinWidth(min_width) => {
            // In case a min_width is specified, we can already fix the size of the column
            // right now (since we already know the max_content_width.
            if info.max_width() <= min_width {
                let width = info.without_padding(min_width);
                info.set_content_width(width);
                info.fixed = true;
            }
        }
        MaxWidth(max_width) => info.constraint = Some(MaxWidth(max_width)),
        Percentage(percent) => {
            if let Some(table_width) = table_width {
                let mut width = (table_width as i32 * percent as i32 / 100) as u16;
                width = info.without_padding(width as u16);
                info.set_content_width(width);
                info.fixed = true;
            }
        }
        MinPercentage(percent) => {
            if let Some(table_width) = table_width {
                let min_width = (table_width as i32 * percent as i32 / 100) as u16;
                if info.max_width() <= min_width {
                    let width = info.without_padding(min_width);
                    info.set_content_width(width);
                    info.fixed = true;
                }
            }
        }
        MaxPercentage(percent) => {
            if let Some(table_width) = table_width {
                let max_width = (table_width as i32 * percent as i32 / 100) as u16;
                info.constraint = Some(MaxWidth(max_width));
            }
        }
        Hidden => {
            info.constraint = Some(ColumnConstraint::Hidden);
        }
    }
}

/// If dynamic arrangement is disabled, simply set the width of all columns
/// to the respective max content width.
fn disabled_arrangement(infos: &mut Vec<ColumnDisplayInfo>) {
    for info in infos.iter_mut() {
        if info.fixed {
            continue;
        }

        if let Some(ColumnConstraint::MaxWidth(max_width)) = info.constraint {
            if max_width < info.max_width() {
                let width = info.without_padding(max_width);
                info.set_content_width(width);
                info.fixed = true;
                continue;
            }
        }
        info.set_content_width(info.max_content_width);
        info.fixed = true;
    }
}

/// Try to find the best fit for a given content and table_width
///
/// 1. Determine all Columns that already have a fixed width and subtract it from remaining_width.
/// 2. Check if there are any columns that require less space than the average
///    remaining space for remaining columns. (This includes the MaxWidth Constraint).
/// 3. Take those columns, fix their size and add the surplus in space to the remaining space.
/// 4. Repeat step 2-3 until no columns with smaller size than average remaining space are left.
/// 5. Now it get's a little tricky.
///    Check the documentation of [optimize_space_after_split] for more information.
/// 6. Divide the remaining space in relatively equal chunks.
///
/// This breaks when:
///
/// 1. A user assigns more space to a few columns than there is on the terminal
/// 2. A user provides more than 100% column width over a few columns.
fn dynamic_arrangement(table: &Table, infos: &mut Vec<ColumnDisplayInfo>, table_width: u16) {
    // This will represent the amount of remaining space that has to be distributed between all
    // columns. This value **excludes** borders, lines and padding!
    // Convert to i32 to handle negative values in case we work with a very small terminal
    let mut remaining_width = table_width as i32;
    let column_count = count_visible_columns(infos);

    // Remove space occupied by borders from remaining_width
    if should_draw_left_border(table) {
        remaining_width -= 1;
    }
    if should_draw_right_border(table) {
        remaining_width -= 1;
    }
    if should_draw_vertical_lines(table) {
        remaining_width -= column_count as i32 - 1;
    }

    // All columns that have have been checked.
    let mut checked = Vec::new();

    // Step 1.
    // Subtract all paddings from the remaining width.
    // Remove all already fixed sizes from the remaining_width.
    for (id, info) in infos.iter().enumerate() {
        if info.is_hidden() {
            continue;
        }
        // Remove the fixed padding for each column
        remaining_width -= info.padding_width() as i32;

        // This info already has a fixed width (by Constraint)
        // Subtract width from remaining_width and add to checked.
        if info.fixed {
            remaining_width -= info.content_width() as i32;
            checked.push(id);
        }
    }

    // Step 2-4. Find all columns that require less space than the average
    remaining_width =
        find_columns_less_than_average(remaining_width, column_count, infos, &mut checked);

    let mut remaining_columns = column_count - checked.len();

    // Only check if we can save some space.
    // 1. If the table doesn't already fit into the given width (there are remaining columns).
    // 2. If there's space worth saving (more than two characters per rermaining column).
    if remaining_columns != 0 && remaining_width > (2 * remaining_columns as i32) {
        // This is where Step 5 happens.
        remaining_width = optimize_space_after_split(
            remaining_width,
            remaining_columns,
            infos,
            &mut checked,
            table,
        );
    }

    // Recalculate the remaining column count.
    remaining_columns = column_count - checked.len();

    // The remaining width has already been distributed successfully in Step 5.
    // Abort unless the user forces to use the full width of the table.
    if remaining_columns == 0 {
        if remaining_width > 0 && matches!(table.arrangement, ContentArrangement::DynamicFullWidth)
        {
            distribute_remaining_space(
                infos,
                &mut checked,
                column_count,
                remaining_width as usize,
                false,
            );
        }
        return;
    }

    // Step 6. Equally distribute the remaining_width to all remaining columns
    // If we have less than one space per remaining column, give at least one space per column
    if remaining_width < remaining_columns as i32 {
        remaining_width = remaining_columns as i32;
    }

    distribute_remaining_space(
        infos,
        &mut checked,
        column_count,
        remaining_width as usize,
        true,
    );
}

/// This function is part of the column width calculation process.
///
/// Parameters
/// 1. `remaining_width`: This is the amount of space that isn't yet reserved by any other column.
///                         We need this to determine the average space each column got column.
///                         Any column that needs less than this space can get it's width fixed and
///                         we can use the remaining space for the other columns.
/// 2. `column_count`: The total amount of columns. Used to calculate the average space.
/// 3. `infos`: The ColumnDisplayInfos used anywhere else
/// 4. `checked`: These are all columns which have a fixed width and are no longer need checking.
fn find_columns_less_than_average(
    mut remaining_width: i32,
    column_count: usize,
    infos: &mut [ColumnDisplayInfo],
    checked: &mut Vec<usize>,
) -> i32 {
    let mut found_smaller = true;
    while found_smaller {
        found_smaller = false;
        let remaining_columns = column_count - checked.len();

        // There are no columns left to check. Proceed to the next step
        if remaining_columns == 0 {
            break;
        }

        let average_space = remaining_width / remaining_columns as i32;
        // We have no space left, the terminal is either tiny or the other columns are huge.
        if average_space <= 0 {
            break;
        }

        for (id, info) in infos.iter_mut().enumerate() {
            // Ignore hidden columns
            if info.is_hidden() {
                continue;
            }

            // We already checked this column, skip it
            if checked.contains(&id) {
                continue;
            }

            // The column has a MaxWidth Constraint.
            // we can fix the column to this max_width and mark it as checked, if these
            // two conditions are met:
            // - The average remaining space is bigger then the MaxWidth constraint.
            // - The actual max content of the column is bigger than the MaxWidth constraint.
            if let Some(ColumnConstraint::MaxWidth(max_width)) = info.constraint {
                // Max/Min constraints always include padding!
                let space_after_padding = average_space + info.padding_width() as i32;

                // Check that both conditions mentioned above are met.
                if max_width as i32 <= space_after_padding && info.max_width() >= max_width {
                    let width = info.without_padding(max_width);
                    info.set_content_width(width);
                    info.fixed = true;
                    checked.push(id);

                    remaining_width -= info.width() as i32;
                    found_smaller = true;
                    continue;
                }
            }

            // The column has a smaller max_content_width than the average space.
            // Fix the width to max_content_width and mark it as checked
            if (info.max_content_width as i32) < average_space {
                info.set_content_width(info.max_content_width);
                info.fixed = true;
                checked.push(id);

                remaining_width -= info.max_content_width as i32;
                found_smaller = true;
            }
        }
    }

    remaining_width
}

/// Step 5.
///
/// Some Column's are too big and need to be split.
/// We're now going to simulate how this might look like.
/// The reason for this is the way we're splitting, i.e. to prefer a split at a delimiter.
/// This can lead to a column needing less space than it was initially assigned.
/// By doing this for each column, we can save a lot of space in some edge-cases.
fn optimize_space_after_split(
    mut remaining_width: i32,
    mut remaining_columns: usize,
    infos: &mut [ColumnDisplayInfo],
    checked: &mut Vec<usize>,
    table: &Table,
) -> i32 {
    let mut distribution = BTreeMap::new();
    for (id, info) in infos.iter_mut().enumerate() {
        // Ignore hidden columns
        if info.is_hidden() {
            continue;
        }

        // We already checked this column, skip it
        if checked.contains(&id) {
            continue;
        }

        // Calculate the average space that remains for each column.
        let average_space = remaining_width / remaining_columns as i32;

        let longest_line = get_longest_line_after_split(average_space, id, info, table);

        // If there's a considerable amount space left after splitting the content,
        // save the calculated space and add the gained space to the remaining_width.
        let remaining_space = average_space - longest_line as i32;
        if remaining_space >= 3 {
            distribution.insert(id, longest_line);
            checked.push(id);
            info.set_content_width(longest_line as u16);

            remaining_width -= longest_line as i32;
            remaining_columns -= 1;
        }
    }

    remaining_width
}

/// Part of Step 5.
/// This function simulates the split of a Column's content and returns the longest
/// existing line after the split.
fn get_longest_line_after_split(
    average_space: i32,
    id: usize,
    info: &mut ColumnDisplayInfo,
    table: &Table,
) -> usize {
    let mut column_lines = Vec::new();
    // A lot of this logic is duplicated from the [utils::format::format_row] function.
    for cell in table.column_cells_iter(id) {
        // Only look at rows that actually contain this cell.
        let cell = if let Some(cell) = cell {
            cell
        } else {
            continue;
        };

        // Determine, which delimiter should be used
        let delimiter = if let Some(delimiter) = cell.delimiter {
            delimiter
        } else if let Some(delimiter) = info.delimiter {
            delimiter
        } else if let Some(delimiter) = table.delimiter {
            delimiter
        } else {
            ' '
        };

        // Temporarily set the content_width of the column to the remaining average space.
        // That way we can simulate how the splitted text will look like.
        info.set_content_width(average_space as u16);

        // Iterate over each line and split it into multiple lines, if necessary.
        // Newlines added by the user will be preserved.
        for line in cell.content.iter() {
            if (line.chars().count() as u16) > info.content_width() {
                let mut splitted = super::split::split_line(&line, &info, delimiter);
                column_lines.append(&mut splitted);
            } else {
                column_lines.push(line.into());
            }
        }
    }

    // Check how long the longest line is after the content splitting
    let mut longest_line = 0;
    for line in column_lines {
        if line.len() > longest_line {
            longest_line = line.len();
        }
    }

    longest_line
}

/// Distribute any remaining space between any remaining columns.
/// There are two modes.
/// 1. unchecked_only == true
///     In this mode, only unchecked columns will get more space.
///     This way we can give some columns which don't have enough space a little more space.
/// 2. unchecked_only == false
///     In this mode any remaining space will be distributed between ALL columns.
fn distribute_remaining_space(
    infos: &mut [ColumnDisplayInfo],
    checked: &mut Vec<usize>,
    column_count: usize,
    remaining_width: usize,
    unchecked_only: bool,
) {
    let remaining_columns = if unchecked_only {
        column_count - checked.len()
    } else {
        count_visible_columns(infos)
    };

    if remaining_columns == 0 {
        return;
    }

    // Calculate the amount of average remaining space per column.
    // Since we do integer division, there is most likely a little bit of not equally divisable space.
    // We then try to distribute it as fair as possible (from left to right).
    let average_space = remaining_width / remaining_columns;
    let mut excess = remaining_width - (average_space * remaining_columns);

    for (id, info) in infos.iter_mut().enumerate() {
        // Ignore hidden columns
        if info.is_hidden() {
            continue;
        }

        // We already checked this column, skip it
        if unchecked_only && checked.contains(&id) {
            continue;
        }

        // Distribute the excess until nothing is left
        let mut width = if excess > 0 {
            excess -= 1;
            (average_space + 1) as u16
        } else {
            average_space as u16
        };

        // If the width of all columns is already fixed and any remaining width needs to be
        // distributed between all columns, we have to add the additional space to the already
        // fixed space of the column
        if !unchecked_only {
            width += info.content_width();
        }

        info.set_content_width(width);
        info.fixed = true;
    }
}

fn count_visible_columns(infos: &[ColumnDisplayInfo]) -> usize {
    let mut count = 0;
    for info in infos {
        if !info.is_hidden() {
            count += 1;
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_disabled_arrangement() {
        let mut table = Table::new();
        table.set_header(&vec!["head", "head", "head"]);
        table.add_row(&vec!["four", "fivef", "sixsix"]);

        let display_infos = arrange_content(&table);
        // The max_ width should just be copied from the column
        let max_widths: Vec<u16> = display_infos
            .iter()
            .map(|info| info.max_content_width)
            .collect();
        assert_eq!(max_widths, vec![4, 5, 6]);

        // In default mode without any constraints
        let widths: Vec<u16> = display_infos.iter().map(|info| info.width()).collect();
        assert_eq!(widths, vec![6, 7, 8]);
    }
}
