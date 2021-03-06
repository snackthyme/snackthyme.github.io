import * as d3 from 'd3';

import {View} from './View.js';

export class TableView extends View {
    constructor(model, container, parent, params) {
        super(model, container, parent);

        this.dims = {
            landscape: {
                width: 0.5,
                height: 0.7,
                top: 0.6
            },
            portrait: {
                width: 0.9,
                height: 0.7,
                top: 0.6
            }
        };

        // can't ever decide how many gradients I want so this is staying for now
        this.gradients = [
            {
                id: 'svg-table-header-gradient',
                stop1: 'rgb(245, 113, 67)',
                stop1Opacity: 1,
                stop2: 'rgb(245, 113, 67)',
                stop2Opacity: 1
            },
            {
                id: 'svg-table-content-gradient',
                stop1: 'rgb(255,255,255)',
                stop1Opacity: 0.2,
                stop2: 'rgba(255,255,255)',
                stop2Opacity: 0.2
            }
        ];

        this._captionParams = {
            text: 'Data looks lame at first glance.',
            coords: {
                width: 0.7,
                top: 0.25,
                left: 0.15
            }
        };

        this.thresholds = [
            {name: 'on', calcFunction: null},
            {
                name: 'fadetext',
                calcFunction: () => this.visibleHeight() * (this.dims[this.orientation()].top - 0.35)
            },
            {
                name: 'off',
                calcFunction: () => this.visibleHeight() * (this.dims[this.orientation()].top - 0.15)
            }
        ];

        this._state = 'pageload';
        this.screenHeightRatio = params.heightMult;
        this.textID = 'svg-table-row';
        this.textMaskID = `${this.textID}-mask`;
    }

    topPoints() {
        return [
            {
                displayPoint: () => this.visibleHeight() * 0.25,
                onPoint: 0,
                major: true
            }
        ];
    }

    init(callback) {
        const dims = this.dims[this.orientation()];

        this.table = this.container
          .append('g')
            .attr('id', 'svg-table');

        this.defs = this.table.append('defs');

        this.caption = this.parent.container
          .append('span')
            .classed('caption', true);

        this.buildGradients();

        this.header = this.table.append('g');
        this.rows = this.table.append('g');
        // content background
        this.rows
              .append('rect')
                .classed('svg-table-content-background', true);
        // content rows
        this.model.data.forEach((rowDict) => {
            this.rows.append('g')
                .classed('row-group', true);
        });

        this.update({});
    }

    update(params) {
        const tableView = this;
        const {trigger} = params;
        const changed = this.updateState(window.scrollY); // do things that need to know the state AFTER this

        let capOpacity = this.captionOpacity(window.scrollY);
        this.setCaption(Object.assign({}, this._captionParams, {opacity: capOpacity}));

        const dims = this.dims[this.orientation()];
        this.table.attr('transform', `translate(0, ${dims.top * this.visibleHeight()})`);

        if (changed || trigger === 'resize') {
            const posParams = {
                numCols: this.model.data.columns.length,
                numRows: this.model.data.length,
                tableWidth: this.container.width() * dims.width,
                tableHeight: this.visibleHeight() * dims.height
            };
            posParams.centerLeftOffset = (this.container.width() - posParams.tableWidth) / 2;

            const header = this.drawRow(this.model.data.columns, -1, 'svg-table-header', this.header, posParams);
            header.selectAll('rect').attr('fill', 'url(#svg-table-header-gradient)');

            // move content background into place
            this.rows
              .select('.svg-table-content-background')
                .attr('x', posParams.centerLeftOffset)
                .attr('y', 0)
                .attr('width', posParams.tableWidth)
                .attr('height', posParams.tableHeight)
                .attr('fill', 'url(#svg-table-content-gradient)');

            // draw rows
            this.rows.selectAll('g.row-group').each(function(d, i) {
                let rowDict = tableView.model.data[i];
                let rowData = tableView.model.data.columns.map((colName) => rowDict[colName]);
                // eslint-disable-next-line no-invalid-this
                tableView.drawRow(rowData, i, tableView.textID, d3.select(this), posParams);
            });

            this.table
              .transition()
              .duration(500)
                .attr('opacity', this._state === 'off' ? 0 : 1);
        }

        // fade masks in and out based on state
        if (changed) {
            if (this._state === 'off') {
                tableView.defs.selectAll('mask text')
                    .transition()
                    .duration(500)
                    .attr('opacity', 0);
            } else {
                tableView.defs.selectAll('mask text')
                    .transition()
                    .delay(500)
                    .duration(500)
                    .attr('opacity', 1);
            }
        }
    }

    drawRow(data, rowIndex, className, group, position) {
        const {numCols, numRows, tableWidth, tableHeight, centerLeftOffset} = position;
        const tableView = this;

        const entering = group
          .selectAll('g')
          .data(data)
          .enter()
          .append('g')
            .classed('cell-group', true);

        // cell box
        entering
          .append('rect')
            .classed(className, true);

        // cell content
        entering
          .append('text')
            .classed(className + '-text', true);

        group
          .selectAll(`.${className}`)
            // starting X offset given that the table is in the center
            .attr('x', (d, i) => centerLeftOffset + tableWidth / numCols * i)
            // table row offset, where header is -1
            .attr('y', tableHeight / numRows * rowIndex)
            .attr('width', tableWidth / numCols)
            .attr('height', tableHeight / numRows);

        group
          .selectAll(`.${className}-text`)
            // left side of cell box plus a bit
            .attr('x', (d, i) => centerLeftOffset + tableWidth / numCols * (i + 0.1))
            // vertical center of cell box
            .attr('y', tableHeight / numRows * (rowIndex + 0.5))
            .text((d) => d)
          .transition()
            .attr('opacity', (d, i) => {
                // if (i < 2) return 1;
                return window.scrollY >= tableView.fadeTextThreshold() ? 0 : 1;
            })
            .each(function(d, i) {
                tableView.moveTextMask(d, i, tableView.defs, rowIndex, className, position);
            });

        return group.selectAll('.cell-group');
    }

    captionOpacity(scrollY) {
        let zeroPoint = this._captionParams.coords.top * this.visibleHeight();
        let scrollDiff = zeroPoint - scrollY;
        if (scrollDiff < 0) return 0;

        return scrollDiff / zeroPoint;
    }

    fadeTextThreshold() {
        return this.visibleHeight() * (this.dims[this.orientation()].top - 0.35);
    }

    offThreshold() {
        return this.visibleHeight() * (this.dims[this.orientation()].top - 0.15);
    }

    buildGradients() {
        this.gradients.forEach((spec) => {
            const gradient = this.defs
              .append('linearGradient')
                .attr('id', spec.id)
                .attr('x1', '0%')
                .attr('x2', '0%')
                .attr('y1', '0%')
                .attr('y2', '100%');
            gradient
              .append('stop')
                .attr('offset', '0%')
                .attr('stop-color', spec.stop1)
                .attr('stop-opacity', spec.stop1Opacity);
            gradient
              .append('stop')
                .attr('offset', '100%')
                .attr('stop-color', spec.stop2)
                .attr('stop-opacity', spec.stop2Opacity);
        });
    }

    moveTextMask(d, i, defs, rowIndex, className, position) {
        if (rowIndex < 0 || i > 1) return; // skip header and anything past first two columns

        const {numCols, numRows, tableWidth, tableHeight, centerLeftOffset} = position;

        if (defs.select(`#${className}-mask-${rowIndex}`).empty()) {
            defs
              .append('mask')
                .attr('id', `${className}-mask-${rowIndex}`)
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', '100%')
                .attr('height', '100%')
              .append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', 'white');
        }

        let mask = defs.select(`#${className}-mask-${rowIndex}`);
        let text = mask.selectAll('text').filter((datum) => datum === d);
        if (text.empty()) {
            mask.append('text')
                .datum(d)
                .classed(`${className}-mask-text`, true);
        }

        text.attr('x', centerLeftOffset + tableWidth / numCols * (i + 0.1))
            .attr('y', tableHeight / numRows * (rowIndex + 0.5))
            .text(d);
    }
}
