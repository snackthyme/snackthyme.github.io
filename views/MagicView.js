import * as d3 from 'd3';

import {TableView} from './TableView';
import {BarChartView} from './BarChartView';
import {MapView} from './MapView';
import {SliderView} from './SliderView';
import {TooltipView} from './TooltipView';
import {FinalView} from './FinalView';
import {ScrollIndicator} from './ScrollIndicator';

export class MagicView {
    constructor(model, container) {
        this.model = model;
        this.container = container;

        const BAR_FADE_POINT = 1.7;
        const MAP_FOCUS_POINT = 2;
        const MAP_HOVER_POINT = 3;
        const MAP_DONE_POINT = 4;

        this.caption = this.container.select('#caption');

        const tableSVG = this.viewify(this.container.insert('svg', '#final').attr('id', 'magic-svg-1'));
        this.tableView = new TableView(
            model, tableSVG, this,
            {
                heightMult: MAP_FOCUS_POINT
            }
        );

        const barChartSVG = this.viewify(this.container.insert('svg', '#final').attr('id', 'magic-svg-2'));
        this.barChartView = new BarChartView(
            model, barChartSVG, this,
            {
                maskID: this.tableView.textMaskID,
                fadePoint: BAR_FADE_POINT,
                donePoint: MAP_FOCUS_POINT
            }
        );

        const mapSVG = this.viewify(this.container.insert('svg', '#final').attr('id', 'magic-svg-3'));
        this.mapView = new MapView(
            model, mapSVG, this,
            {
                splitPoint: BAR_FADE_POINT,
                focusPoint: MAP_FOCUS_POINT,
                hoverPoint: MAP_HOVER_POINT,
                donePoint: MAP_DONE_POINT
            }
        );

        const sliderDiv = this.viewify(this.container.insert('div', '#final').attr('id', 'slider'));
        this.sliderView = new SliderView(
            model, sliderDiv, this,
            {
                offPoint: BAR_FADE_POINT
            }
        );

        const finalDiv = this.viewify(d3.select('#final'));
        this.finalView = new FinalView(
            model, finalDiv, this,
            {
                onPoint: MAP_DONE_POINT
            }
        );

        const tooltipDiv = this.viewify(this.container.insert('div', '#final').attr('id', 'tooltip'));
        this.tooltipView = new TooltipView(model, tooltipDiv, this).tag('tooltip');

        const pointViews = [
            this.tableView,
            this.barChartView,
            this.mapView,
            this.finalView
        ];

        let points = [];
        pointViews.forEach((view) => {
            points = points.concat(view.topPoints());
        });

        const scrollDiv = this.viewify(this.container.insert('svg', '#final').attr('id', 'scroll'));
        this.scrollIndicator = new ScrollIndicator(model, scrollDiv, this, points);

        this.views = [
            this.tableView,
            this.barChartView,
            this.mapView,
            this.sliderView,
            this.tooltipView,
            this.finalView,
            this.scrollIndicator
        ];
    }

    init() {
        this.model.addObserver(this);
        this.views.forEach((view) => {
            view.setHeight(document.body.clientHeight);
            view.init();
        });
        this.container.style('height', this.bodyHeight());

        this.views.forEach((view) => {view.ready();});

        window.addEventListener('resize', () => this.update({trigger: 'resize'}));
        window.addEventListener('scroll', () => this.update({trigger: 'scroll'}));
        return this;
    }

    update(params) {
        this.views.forEach((view) => {
            view.setHeight(document.body.clientHeight);
        });
        this.container.style('height', this.bodyHeight());
        this.views.forEach((view) => {
            if (!params.matches || view.matches(params.matches)) {
                view.update(params);
            }
        });
    }

    bodyHeight() {
        let tableSVG = this.tableView.container;
        let mapSVG = this.mapView.container;
        return tableSVG.height() + mapSVG.height() + document.body.clientHeight;
    }

    viewify(selection) {
        // adds some extras to a D3 SVG selection
        selection.width = function() {
            return this.node().getBoundingClientRect().width;
        };

        selection.height = function() {
            return this.node().getBoundingClientRect().height;
        };

        selection.viewportTop = function() {
            return this.node().getBoundingClientRect().top;
        };

        selection.top = function() {
            return window.scrollY + this.node().getBoundingClientRect().top;
        };

        return selection;
    }
}
