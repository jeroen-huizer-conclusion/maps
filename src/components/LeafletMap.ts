import { Component, createElement } from "react";
import {
    FeatureGroup,
    LatLngLiteral,
    LeafletEvent,
    LeafletMouseEvent,
    Map,
    Marker,
    Popup,
    TileLayerOptions,
    icon,
    tileLayer
} from "leaflet";
import * as classNames from "classnames";
import ReactResizeDetector from "react-resize-detector";

import { Container, MapUtils } from "../utils/namespace";
import Utils from "../utils/Utils";
import { Alert } from "./Alert";
import { validLocation } from "../utils/Validations";

type MapProps = Container.MapProps;
type ContextMenuProps = Container.ContextMenuProps;
type DataSourceLocationProps = Container.DataSourceLocationProps;
type Location = Container.Location;
type SharedProps = MapUtils.SharedProps;

const customUrls = Utils.customUrls;
const mapAttr = Utils.mapAttr;

export interface LeafletMapProps extends SharedProps, MapProps, ContextMenuProps {
    onClickMarker?: (event: LeafletEvent, locationAttr: DataSourceLocationProps) => void;
    onClickContextMenuAction?: (action: Container.ContextMenuAction, latitude?: number, longitude?: number) => void;
}

export interface LeafletMapState {
    center: LatLngLiteral;
    alertMessage?: string;
    resized: boolean;
}

export class LeafletMap extends Component<LeafletMapProps, LeafletMapState> {
    private leafletNode?: HTMLDivElement;
    private defaultCenterLocation: LatLngLiteral = { lat: 51.9066346, lng: 4.4861703 };
    private map?: Map;
    private markerGroup = new FeatureGroup();
    private readonly onResizeHandle = this.onResize.bind(this);
    private popup?: Popup;

    readonly state: LeafletMapState = {
        center: this.getDefaultCenter(this.props),
        resized: false
    };

    render() {
        return createElement("div", {
                className: classNames("widget-maps", this.props.className),
                style: { ...this.props.divStyles , ...Utils.getDimensions(this.props) }
            },
            createElement(Alert, {
                bootstrapStyle: "danger",
                className: "widget-leaflet-maps-alert leaflet-control"
            }, this.state.alertMessage),
            createElement("div",
                {
                    className: "widget-leaflet-maps-wrapper"
                },
                createElement("div", {
                    className: "widget-leaflet-maps",
                    ref: this.getRef
                }),
                createElement(ReactResizeDetector, {
                    handleWidth: true,
                    handleHeight: true,
                    refreshRate: 100,
                    refreshMode: "throttle",
                    onResize: this.onResizeHandle
                })
            )
        );
    }

    componentDidMount() {
        if (this.leafletNode && !this.map) {
            this.map = new Map(this.leafletNode, {
                    scrollWheelZoom: this.props.optionScroll,
                    zoomControl: this.props.optionZoomControl,
                    attributionControl: this.props.attributionControl,
                    zoom: this.props.zoomLevel,
                    minZoom: 2,
                    // Work around for page scroll down to botom on first click on map in Chrome and IE
                    // https://github.com/Leaflet/Leaflet/issues/5392
                    keyboard: false,
                    dragging: this.props.optionDrag
                })
                .addLayer(this.setTileLayer());
            if (this.props.inPreviewMode) {
                this.setDefaultCenter(this.props);
            }
            if (this.props.popupActions && this.props.popupActions.length) {
                this.popup = this.createPopup();
                this.map.on("contextmenu", this.openPopup);
            }
        }
    }

    componentWillReceiveProps(nextProps: LeafletMapProps) {
        if (nextProps.alertMessage !== this.props.alertMessage) {
            this.setState({ alertMessage: nextProps.alertMessage });
        }
        if (this.props.allLocations !== nextProps.allLocations) {
            this.setDefaultCenter(nextProps);
            this.setState({ resized: false });
        }
    }

    componentDidUpdate() {
        if (this.map && !this.props.fetchingData) {
            this.map.panTo(this.state.center);
        }
    }

    componentWillUnmount() {
        if (this.map) {
            this.map.remove();
        }
    }

    private getDefaultCenter(props: LeafletMapProps): LatLngLiteral {
        const { defaultCenterLatitude, defaultCenterLongitude } = props;
        const location = {
            latitude: defaultCenterLatitude && parseFloat(defaultCenterLatitude),
            longitude: defaultCenterLongitude && parseFloat(defaultCenterLongitude)
        };
        if (validLocation(location)) {
            return {
                lat: parseFloat(defaultCenterLatitude!),
                lng: parseFloat(defaultCenterLongitude!)
            };
        }

        return this.defaultCenterLocation;
    }

    private onResize() {
        // When map is placed on the non default tab, the maps has no size.
        // Therefor it need to update on the first view.
        if (this.map && !this.state.resized) {
            this.map!.invalidateSize();
            this.setDefaultCenter(this.props);
            this.setBounds();
            this.setState({ resized: true });
        }
    }

    private getRef = (node: HTMLDivElement) => {
        this.leafletNode = node;
    }

    private setTileLayer = () => {
        const { mapProvider, mapsToken } = this.props;

        let urlTemplate = "";
        let mapAttribution = "";
        if (mapProvider === "mapBox") {
            urlTemplate = customUrls.mapbox + mapsToken;
            mapAttribution = mapAttr.mapboxAttr;
        } else if (mapProvider === "hereMaps" && mapsToken && mapsToken.indexOf(",") > 0) {
            const splitToken = mapsToken.split(",");
            urlTemplate = customUrls.hereMaps + `app_id=${splitToken[0]}&app_code=${splitToken[1]}`;
            mapAttribution = mapAttr.hereMapsAttr;
        } else {
            urlTemplate = customUrls.openStreetMap;
            mapAttribution = mapAttr.openStreetMapAttr;
        }

        return tileLayer(urlTemplate, {
            attribution: mapAttribution,
            id: mapProvider === "mapBox" ? "mapbox.streets" : undefined
        } as TileLayerOptions);
    }

    private setDefaultCenter = (props: LeafletMapProps) => {
        if (!props.fetchingData) {
            this.renderMarkers(props.allLocations);
        }
    }

    private renderMarkers = (locations?: Location[]) => {
        this.markerGroup.clearLayers();
        if (locations && locations.length) {
            locations.forEach(location => {
                const marker = this.createMarker(location);
                const layer = this.markerGroup.addLayer(marker.on("click", event => {
                    if (this.props.onClickMarker && location.locationAttr && location.locationAttr.onClickEvent !== "doNothing") {
                        this.props.onClickMarker(event, location.locationAttr);
                    }
                }));
                this.map!.addLayer(layer);
            });
            this.setBounds();
        } else if (this.map) {
            this.map.removeLayer(this.markerGroup);
            this.map.setZoom(this.props.zoomLevel);
        }
    }

    private setBounds = () => {
        const { defaultCenterLatitude, defaultCenterLongitude, autoZoom, zoomLevel } = this.props;
        setTimeout(() => {
            if (this.map && this.markerGroup) {
                const bounds = this.markerGroup.getBounds();
                if (bounds.isValid()) {
                    this.map.fitBounds(this.markerGroup.getBounds(), { animate: false }).invalidateSize();
                }
                if (!autoZoom) {
                    if (defaultCenterLatitude && defaultCenterLongitude) {
                        this.map.panTo({
                            lat: parseFloat(defaultCenterLatitude),
                            lng: parseFloat(defaultCenterLongitude)
                        }, { animate: false });
                    }
                    this.map.setZoom(zoomLevel);
                }
            }
        }, 0);
    }

    private createMarker = (location: Location): Marker => {
        const { latitude, longitude, url } = location;
        const marker = new Marker([ Number(latitude), Number(longitude) ]);
        if (url) {
            marker.setIcon(icon({
                iconUrl: url,
                iconSize: [ 32 , 32 ],
                className: "marker"
            }));
        }

        return marker;
    }

    private openPopup = (e: LeafletMouseEvent) => {
        if (this.popup && this.map) {
            this.popup.setLatLng(e.latlng);
            this.popup.openOn(this.map);
        }
    }

    private handleActionClick = (action: Container.ContextMenuAction) => {

        let lat; let lng;
        if (this.popup) {
            const latLng = this.popup.getLatLng();
            lat = latLng ? latLng.lat : undefined;
            lng = latLng ? latLng.lng : undefined;
        }

        if (this.props.onClickContextMenuAction) {
            this.props.onClickContextMenuAction(action, lat, lng);
        }

        if (this.map)
            this.map.closePopup();
    }

    private createPopup = (): Popup => {

        const content = document.createElement("div");
        content.innerHTML = `<div>${this.props.popupTitle}</div>`;

        if (this.props.popupActions) {
            this.props.popupActions.forEach(popupAction => {
                const link = document.createElement("a");
                link.className = "mx-link";
                link.addEventListener("click", () => {
                    this.handleActionClick(popupAction);
                });

                const glyph = document.createElement("span");
                glyph.className = "glyphicon glyphicon-chevron-right";
                link.appendChild(glyph);
                link.innerHTML += `${popupAction.actionLabel}`;

                const row = document.createElement("div");
                row.appendChild(link);
                content.appendChild(row);
            });

        }

        return new Popup()
            .setContent(content);
    }
}
