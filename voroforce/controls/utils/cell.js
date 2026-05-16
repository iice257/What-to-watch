export const getCellIndex = (cellOrCellIndex) => {
  if (cellOrCellIndex === null || cellOrCellIndex === undefined) return
  return typeof cellOrCellIndex === 'number'
    ? cellOrCellIndex
    : cellOrCellIndex.index
}

export const getCell = (cellOrCellIndex, cells) => {
  if (cellOrCellIndex === null || cellOrCellIndex === undefined) return
  return typeof cellOrCellIndex === 'number'
    ? cells[cellOrCellIndex]
    : cellOrCellIndex
}

export const getDirectionalNeighborCellIndex = (
  cell,
  direction,
  latticeConfig,
) => {
  const { cols, rows } = latticeConfig
  const currentRow = cell.row
  const currentCol = cell.col

  let targetRow = currentRow
  let targetCol = currentCol

  switch (direction) {
    case 'up':
      targetRow = Math.max(0, currentRow - 1)
      break
    case 'down':
      targetRow = Math.min(rows - 1, currentRow + 1)
      break
    case 'left':
      targetCol = Math.max(0, currentCol - 1)
      break
    case 'right':
      targetCol = Math.min(cols - 1, currentCol + 1)
      break
  }

  if (targetRow === currentRow && targetCol === currentCol) {
    return null
  }

  return targetRow * cols + targetCol
}
