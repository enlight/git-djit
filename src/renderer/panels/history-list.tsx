// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { Classes as BlueprintClasses } from '@blueprintjs/core';
import { autobind } from '@uifabric/utilities';
import { observer } from 'mobx-react';
import * as React from 'react';
// import { style } from 'typestyle';
import {
  AutoSizer,
  Column as VirtualizedTableColumn,
  Dimensions as IAutoSizerDimensions,
  Table as VirtualizedTable,
  TableCellProps as ITableCellProps
} from 'react-virtualized';

import ReactWidget from '../react-widget';
import { IAppStore } from '../storage/app-store';
import { ICommitModel } from '../storage/git-store';

export interface IHistoryListProps {
  appStore: IAppStore;
}

enum TableColumnDataKey {
  Summary = 'summary',
  Author = 'author',
  Date = 'date'
}

interface ICellProps {
  rowIndex: number;
  commits: ICommitModel[];
}
const SummaryCell = observer((props: ICellProps) => {
  const isLoaded = props.rowIndex < props.commits.length;
  return isLoaded ? <div>{props.commits[props.rowIndex].summary}</div> : <div>{'Loading...'}</div>;
});
const AuthorCell = observer((props: ICellProps) => {
  const isLoaded = props.rowIndex < props.commits.length;
  return isLoaded ? <div>{props.commits[props.rowIndex].authorName}</div> : null;
});
const DateCell = observer((props: ICellProps) => {
  const isLoaded = props.rowIndex < props.commits.length;
  return isLoaded ? <div>{props.commits[props.rowIndex].date.toLocaleString()}</div> : null;
});

@observer
class HistoryList extends React.Component<IHistoryListProps> {
  /*
  private rootClass = style({
    // flex: '1 1 auto',
    // display: 'flex',
    // flexDirection: 'column',
    position: 'absolute',
    width: '100%',
    height: '100%',
  });
*/
  render() {
    const repository = this.props.appStore.selectedRepository;
    return (
      <AutoSizer
        // repositoryName, historySize, and loadedHistorySize aren't actually AutoSizer props but
        // AutoSizer won't rerender the table unless a prop changes.
        repositoryName={repository!.name}
        historySize={repository!.totalHistorySize}
        loadedHistorySize={repository!.commits.length}>
        {this._renderTable}
      </AutoSizer>
    );
  }

  @autobind
  private _renderTable({ width, height }: IAutoSizerDimensions) {
    const repository = this.props.appStore.selectedRepository;
    return (
      <VirtualizedTable
        // repositoryName and loadedRowCount aren't actual Table props, but Table won't rerender
        // unless a prop changes.
        repositoryName={repository!.name}
        loadedRowCount={repository!.commits.length}
        width={width}
        height={height}
        headerHeight={24}
        rowHeight={16}
        rowCount={repository!.totalHistorySize}
        rowGetter={this._getRowAtIndex}>
        <VirtualizedTableColumn
          label="Summary"
          dataKey={TableColumnDataKey.Summary}
          flexGrow={1}
          width={250}
          minWidth={100}
          cellDataGetter={this._getCellData}
          cellRenderer={this._renderCell}
        />
        <VirtualizedTableColumn
          label="Author"
          dataKey={TableColumnDataKey.Author}
          width={150}
          minWidth={50}
          cellDataGetter={this._getCellData}
          cellRenderer={this._renderCell}
        />
        <VirtualizedTableColumn
          label="Date"
          dataKey={TableColumnDataKey.Date}
          width={150}
          minWidth={50}
          cellDataGetter={this._getCellData}
          cellRenderer={this._renderCell}
        />
      </VirtualizedTable>
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

  @autobind
  private _renderCell(args: ITableCellProps) {
    const repository = this.props.appStore.selectedRepository;
    switch (args.dataKey) {
      case TableColumnDataKey.Summary:
        return <SummaryCell rowIndex={args.rowIndex} commits={repository!.commits} />;
      case TableColumnDataKey.Author:
        return <AuthorCell rowIndex={args.rowIndex} commits={repository!.commits} />;
      case TableColumnDataKey.Date:
        return <DateCell rowIndex={args.rowIndex} commits={repository!.commits} />;
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
    this.node.setAttribute('role', 'tabpanel');
    this.id = 'historyList';
    this.title.label = 'History';
  }
}
