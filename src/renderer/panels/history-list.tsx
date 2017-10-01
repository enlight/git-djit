// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Classes as BlueprintClasses } from '@blueprintjs/core';
import { autobind } from '@uifabric/utilities';
import { action, autorunAsync, computed, IReactionDisposer, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import * as React from 'react';
import Draggable, { DraggableData } from 'react-draggable';
import {
  Column as VirtualizedTableColumn,
  ColumnProps,
  Table as VirtualizedTable,
  TableCellProps as ITableCellProps,
  TableHeaderRowProps
} from 'react-virtualized';
import { style } from 'typestyle';

import ReactWidget from '../react-widget';
import { IAppStore } from '../storage/app-store';
import { ICommitModel } from '../storage/git-store';
import { tableStyle } from '../style';

export interface IHistoryListProps {
  appStore: IAppStore;
}

enum TableColumnId {
  Summary = 'summary',
  Author = 'author',
  Date = 'date'
}

interface IColumnProps extends ColumnProps {
  dataKey: TableColumnId;
  resizeHandleX: number;
}

interface ICellProps {
  rowIndex: number;
  commits: ICommitModel[];
  className: string;
}

const SummaryCell = observer((props: ICellProps) => {
  const isLoaded = props.rowIndex < props.commits.length;
  if (isLoaded) {
    return <div className={props.className}>{props.commits[props.rowIndex].summary}</div>;
  }
  return <div className={props.className}>{'Loading...'}</div>;
});

const AuthorCell = observer((props: ICellProps) => {
  const isLoaded = props.rowIndex < props.commits.length;
  if (isLoaded) {
    return <div className={props.className}>{props.commits[props.rowIndex].authorName}</div>;
  }
  return null;
});

const commitDateTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function formatDate(dateFormat: Intl.DateTimeFormat, date: Date): string {
  return dateFormat.format(date).replace(/,/g, ' ');
}

const DateCell = observer((props: ICellProps) => {
  const isLoaded = props.rowIndex < props.commits.length;
  if (isLoaded) {
    return (
      <div className={props.className}>
        {formatDate(commitDateTimeFormat, props.commits[props.rowIndex].date)}
      </div>
    );
  }
  return null;
});

@observer
class HistoryList extends React.Component<IHistoryListProps> {
  private _tableContainerStyle = style({
    flex: '1 1 auto',
    overflow: 'auto',
    backgroundColor: tableStyle.backgroundColor,
    boxShadow: `0 0 0 ${tableStyle.tableBorderWidth} ${tableStyle.tableBorderColor}`
  });

  private _columnHeaderStyle = style({
    // ditch the margins to make it easier to compute resize handle positions
    margin: '0 !important',
    paddingLeft: 5,
    paddingRight: 5,
    backgroundColor: tableStyle.headerBackgroundColor,
    boxShadow: [
      `inset -${tableStyle.tableBorderWidth} 0 0 ${tableStyle.tableBorderColor}`,
      `inset 0 -${tableStyle.tableBorderWidth} 0 ${tableStyle.tableBorderColor}`
    ].join(','),
    $nest: {
      '&:hover': {
        backgroundColor: tableStyle.headerHoverBackgroundColor
      }
    }
  });

  private _outerCellStyle = style({
    margin: '0 !important',
    paddingLeft: 5,
    paddingRight: 5
  });

  private _innerCellStyle = style({
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis'
  });

  private _tableOverlayStyle = style({
    position: 'absolute',
    top: 20, // account for 20px padding of the tab panel
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'none'
  });

  private _resizeHandleStyle = style({
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    height: 'auto',
    marginLeft: -2,
    marginRight: -2,
    marginTop: 0,
    marginBottom: 0,
    pointerEvents: 'auto',
    $nest: {
      '&:hover': {
        cursor: 'ew-resize'
      },
      '&.react-draggable-dragging': {
        cursor: 'ew-resize',
        backgroundColor: tableStyle.resizeHandleColor
      }
    }
  });

  private _tableContainer: HTMLDivElement | null = null;
  private _tableResizeObserver: ResizeObserver | null = null;
  private _disposeAutoAdjustResizeHandles: IReactionDisposer | null = null;

  @observable private _tableWidth = 0;
  @observable private _tableHeight = 0;
  @observable private _tableScrollbarWidth = 0;
  @observable private _columns = new Map<TableColumnId, IColumnProps>();

  // private _columnRefToIdMap = new Map<Element, TableColumnId>();

  @computed
  get renderedColumns(): JSX.Element[] {
    return Array.from(this._columns.values()).map(p => (
      <VirtualizedTableColumn key={p.dataKey} {...p} />
    ));
  }

  @computed
  get renderedResizeHandles(): JSX.Element[] {
    const columns = Array.from(this._columns.values());
    const handles = [];
    for (let i = 0; i < columns.length - 1; i++) {
      const columnId = columns[i].dataKey;
      const resize = (_: MouseEvent, data: DraggableData) => this._resizeColumn(columnId, data.x);
      handles.push(
        <Draggable
          key={`${columnId}-handle`}
          axis="x"
          position={{ x: columns[i].resizeHandleX, y: 0 }}
          onStop={resize}>
          <div className={this._resizeHandleStyle} />
        </Draggable>
      );
    }
    return handles;
  }

  constructor(props: IHistoryListProps) {
    super(props);

    this._columns.set(TableColumnId.Summary, {
      label: 'Summary',
      dataKey: TableColumnId.Summary,
      flexGrow: 1,
      width: 250,
      minWidth: 100,
      cellDataGetter: this._getCellData,
      headerClassName: this._columnHeaderStyle,
      className: this._outerCellStyle,
      // headerRenderer: this._renderColumnHeader,
      cellRenderer: this._renderCell,
      resizeHandleX: 0
    });
    this._columns.set(TableColumnId.Author, {
      label: 'Author',
      dataKey: TableColumnId.Author,
      width: 150,
      minWidth: 50,
      cellDataGetter: this._getCellData,
      headerClassName: this._columnHeaderStyle,
      className: this._outerCellStyle,
      // headerRenderer: this._renderColumnHeader,
      cellRenderer: this._renderCell,
      resizeHandleX: 0
    });
    this._columns.set(TableColumnId.Date, {
      label: 'Date',
      dataKey: TableColumnId.Date,
      width: 150,
      minWidth: 50,
      cellDataGetter: this._getCellData,
      headerClassName: this._columnHeaderStyle,
      className: this._outerCellStyle,
      cellRenderer: this._renderCell,
      resizeHandleX: 0
    });

    this._disposeAutoAdjustResizeHandles = autorunAsync(
      'adjustResizeHandles',
      this._adjustResizeHandles,
      1
    );
    this._tableResizeObserver = new ResizeObserver(this._onDidResizeTable);
  }

  componentWillUnmount() {
    if (this._disposeAutoAdjustResizeHandles) {
      this._disposeAutoAdjustResizeHandles();
      this._disposeAutoAdjustResizeHandles = null;
    }
    if (this._tableResizeObserver) {
      this._tableResizeObserver.disconnect();
      this._tableResizeObserver = null;
    }
    // this._columnRefToIdMap.clear();
  }

  render() {
    const repository = this.props.appStore.selectedRepository;
    console.log('Rendering table');
    return (
      <div className={this._tableContainerStyle} ref={this._setTableContainerRef}>
        <VirtualizedTable
          // repositoryName and loadedRowCount aren't actual Table props, but Table won't rerender
          // unless a prop changes.
          repositoryName={repository!.name}
          loadedRowCount={repository!.commits.length}
          width={this._tableWidth}
          height={this._tableHeight}
          headerHeight={24}
          rowHeight={16}
          rowCount={repository!.totalHistorySize}
          rowGetter={this._getRowAtIndex}
          headerRowRenderer={this._rendererHeaderRow}>
          {this.renderedColumns}
        </VirtualizedTable>
        <div className={this._tableOverlayStyle} aria-hidden={true}>
          {this.renderedResizeHandles}
        </div>
      </div>
    );
  }

  @autobind
  private _setTableContainerRef(ref: HTMLDivElement) {
    this._tableContainer = ref;
    if (ref) {
      this._tableResizeObserver!.observe(ref);
    } else {
      this._tableResizeObserver!.disconnect();
    }
  }

  @autobind
  private _rendererHeaderRow(props: TableHeaderRowProps) {
    const { className, style: inlineStyle, columns } = props;
    runInAction(
      'set_tableScrollbarWidth',
      () => (this._tableScrollbarWidth = inlineStyle.paddingRight)
    );
    return (
      <div className={className} role="row" style={inlineStyle}>
        {columns}
      </div>
    );
  }

  @autobind
  private _getRowAtIndex({ index }: { index: number }): number {
    const repository = this.props.appStore.selectedRepository;
    if (index >= repository!.commits.length) {
      repository!.loadMoreHistory({ minHistorySize: index + 1 });
    }
    // The return value just ends up being passed through to _getCellData() as `rowData`.
    return index;
  }

  @autobind
  private _getCellData(args: { columnData: any; dataKey: string; rowData: number }): number {
    // Normally you'd return the data to be rendered by the default cell renderer, however we
    // don't use the default cell renderer so it doesn't really matter what the return value is.
    return args.rowData;
  }

  /*
  @autobind
  private _renderColumnHeader(headerProps: ITableHeaderProps) {
    const columnId = headerProps.dataKey;
    const setColumnRef = (ref: HTMLDivElement | null) => {
      if (ref) {
        this._columnRefToIdMap.set(ref, columnId);
      }
    };
    return (
      <div className={this._columnHeaderCssClass} ref={setColumnRef}>
        {defaultTableHeaderRenderer(headerProps)}
      </div>
    );
  }
*/

  @action
  private _resizeColumn(columnId: TableColumnId, resizeHandleX: number) {
    const column = this._columns.get(columnId);
    const delta = resizeHandleX - column!.resizeHandleX;
    column!.width += delta;
    const ids = Array.from(this._columns.keys());
    const columnIdx = ids.findIndex(id => id === columnId);
    if (columnIdx !== -1 && columnIdx + 1 < ids.length) {
      this._columns.get(ids[columnIdx + 1])!.width -= delta;
    }
    this._adjustResizeHandles();
  }

  /**
   * Adjust the positions of all table column resize handles to account for current column widths.
   */
  @autobind
  private _adjustResizeHandles() {
    // Some columns have a fixed size (in which case IColumnProps.width will always be the actual
    // width), others may grow via flex-box (if a column grows IColumnProps.width may not match
    // the actual width). The resize handles are overlayed on top of the table so to position
    // them correctly we need to figure out the actual width of each column... the current
    // algorithm doesn't account for flexShrink though... should probably just use
    // getComputedStyle() instead of using this super naive flex-box computation.
    const columns = Array.from(this._columns.values());
    let fixedWidth = 0;
    let flexGrowSum = 0;
    for (const column of columns) {
      if (column.flexGrow) {
        flexGrowSum += column.flexGrow;
      } else {
        fixedWidth += column.width;
      }
    }
    const flexWidth = Math.max(0, this._tableWidth - this._tableScrollbarWidth - fixedWidth);
    let currentWidth = 0;
    for (const column of columns) {
      let columnWidth = column.width;
      if (column.flexGrow) {
        columnWidth = flexWidth * (column.flexGrow / flexGrowSum);
      }
      currentWidth += columnWidth;
      column.resizeHandleX = currentWidth;
    }
  }

  @action.bound
  private _onDidResizeTable(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      if (entry.target && entry.target === this._tableContainer) {
        if (entry.contentRect.height > 0) {
          this._tableWidth = entry.contentRect.width;
          this._tableHeight = entry.contentRect.height;
          console.log(
            `ResizeObserver fired for table, w: ${this._tableWidth}, h: ${this._tableHeight}`
          );
          this._adjustResizeHandles();
        }
        break;
      }
    }
  }
  /*
  @action.bound
  private _onDidResizeColumn(entries: ResizeObserverEntry[]) {
    for (const entry of entries) {
      const columnId = this._columnRefToIdMap.get(entry.target);
      if (columnId) {
        const columnProps = this._columns.get(columnId);
        const columnDiv = entry.target as HTMLDivElement;
        columnProps!.resizeHandleX = columnDiv.offsetLeft + columnDiv.offsetWidth;
        console.log(`ResizeObserver fired for column ${columnId} setting X to ${columnDiv.offsetLeft}, ${columnDiv.offsetWidth}, ${entry.contentRect.width}`);
      }
    }
  }
*/
  @autobind
  private _renderCell(args: ITableCellProps) {
    const repository = this.props.appStore.selectedRepository;
    switch (args.dataKey) {
      case TableColumnId.Summary:
        return (
          <SummaryCell
            className={this._innerCellStyle}
            rowIndex={args.rowIndex}
            commits={repository!.commits}
          />
        );
      case TableColumnId.Author:
        return (
          <AuthorCell
            className={this._innerCellStyle}
            rowIndex={args.rowIndex}
            commits={repository!.commits}
          />
        );
      case TableColumnId.Date:
        return (
          <DateCell
            className={this._innerCellStyle}
            rowIndex={args.rowIndex}
            commits={repository!.commits}
          />
        );
      default:
        throw new Error(
          `Column at index ${args.columnIndex} (dataKey = '${args.dataKey}') doesn't` +
            'have a cell renderer.'
        );
    }
  }
}

export class HistoryListWidget extends ReactWidget<IHistoryListProps> {
  constructor(appStore: IAppStore) {
    super(HistoryList, { appStore });
    this.addClass(BlueprintClasses.TAB_PANEL);
    // BlueprintClasses.TAB_PANEL will add a top margin that's going to throw off whatever
    // computations Phosphor does to absolutely position this widget, as a result content
    // gets cut off at the bottom of the panel. To work around this mess replace the margin with
    // padding.
    this.addClass(style({ marginTop: 0, paddingTop: 20 }));
    this.node.setAttribute('role', 'tabpanel');
    this.id = 'historyList';
    this.title.label = 'History';
  }
}
