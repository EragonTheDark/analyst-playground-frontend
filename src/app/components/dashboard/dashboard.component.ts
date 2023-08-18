import { Component, OnInit, ViewChild, isDevMode } from '@angular/core';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import Locate from '@arcgis/core/widgets/Locate';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Sketch from '@arcgis/core/widgets/Sketch';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import Graphic from '@arcgis/core/Graphic';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import Point from '@arcgis/core/geometry/Point';

// https://developers.arcgis.com/javascript/latest/api-reference/
// https://angular.io/guide/lifecycle-hooks
// http://www.jxgis.cn:8080/arcgis_js_v48_api/arcgis_js_api/sdk/sample-code/draw-measure/index.html
// https://developers.arcgis.com/javascript/latest/find-length-and-area/

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
    polyExtent?: any;
    polyArea?: any;
    areaType?: any;
    sketch?: any;
    longitude: number = -112.20290843602699;
    latitude: number = 36.50550844957497;
    expanded: boolean = false;
    constructor() {}
    ngOnInit(): void {
        if (isDevMode()) {
            console.log('Development!');
        } else {
            console.log('Production!');
        }
        this.loadMap();
    }

    mapData() {
        return {
            extent: this.polyExtent,
            acres: this.polyArea,
        };
    }
    resetParams() {
        this.polyExtent = undefined;
        this.polyArea = undefined;
    }
    getExtent(geometry: any) {}

    setExtent(geometry: any) {
        // console.log(geometry);
        this.polyExtent = webMercatorUtils.webMercatorToGeographic(geometry.extent).toJSON();
        this.polyArea = geometryEngine.geodesicArea(geometry, 'acres');
        if (this.polyArea < 0) {
            // simplify the polygon if needed and calculate the area again
            const simplifiedPolygon: any = geometryEngine.simplify(geometry);
            if (simplifiedPolygon) {
                this.polyArea = geometryEngine.geodesicArea(simplifiedPolygon, 'acres');
            }
        }
        console.log(this.polyExtent, Math.round(this.polyArea) + ' acres');
    }
    loadMap() {
        console.log('loading Map.....', 'Hi Ethan!!!!');
        const vm = this;
        const graphicsLayer = new GraphicsLayer();
        const map = new Map({
            basemap: 'topo-vector',
            layers: [graphicsLayer],
        });

        const view = new MapView({
            container: 'viewDiv',
            map: map,
            zoom: 7,
            center: [vm.longitude, vm.latitude],
        });

        // Create a symbol for drawing the point
        const markerSymbol = {
            type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
            color: [226, 119, 40],
            outline: {
                // autocasts as new SimpleLineSymbol()
                color: [255, 255, 255],
                width: 2,
            },
        };
        view.when(() => {
            const point = new Point({
                longitude: vm.longitude,
                latitude: vm.latitude,
            });

            const pointGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
            });

            graphicsLayer.add(pointGraphic);

            const locateBtn = new Locate({
                view: view,
            });

            // Add the locate widget to the top left corner of the view
            view.ui.add(locateBtn, {
                position: 'top-left',
            });
            // view.ui.add('toolbar', 'top-right');
            const sketch = new Sketch({
                layer: graphicsLayer,
                view: view,
                availableCreateTools: ['polygon', 'rectangle', 'circle'],
                // graphic will be selected as soon as it is created
                creationMode: 'single',
                layout: 'vertical',
            });
            sketch.on('create', function (event: any) {
                if (event.state == 'start') {
                    sketch.viewModel.layer.removeAll();
                    vm.resetParams();
                }
                if (event.state == 'complete') {
                    // remove the graphic from the layer. Sketch adds
                    // the completed graphic to the layer by default.
                    vm.setExtent(event.graphic.geometry);
                }
            });
            sketch.on('update', function (event: any) {
                if (event.state == 'complete') {
                    console.log(event.graphics);
                    vm.setExtent(event.graphics[0].geometry);
                }
            });

            view.ui.add(sketch, 'top-right');

            view.on('click', function (event) {
                vm.longitude = Math.round(event.mapPoint.longitude * 1000) / 1000;
                vm.latitude = Math.round(event.mapPoint.latitude * 1000) / 1000;
                const opts = {
                    include: graphicsLayer,
                };
                view.hitTest(event, opts).then((response) => {
                    // check if a feature is returned from the hurricanesLayer
                    if (!response.results.length) {
                        graphicsLayer.removeAll();
                        const point = new Point({
                            longitude: vm.longitude,
                            latitude: vm.latitude,
                        });

                        const pointGraphic = new Graphic({
                            geometry: point,
                            symbol: markerSymbol,
                        });

                        graphicsLayer.add(pointGraphic);
                        view.goTo({
                            center: [vm.longitude, vm.latitude],
                        });
                    }
                });
            });
        });
    }
}
