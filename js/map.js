"use strict";
var map;
var defaultIcon;
var highlightedIcon;



function googleErrorHandler() {
    $('#query-summary').text("Could not load Google Maps");
    $('#list').hide();
}

//function use for initialize map
function initMap() {
	 "use strict";
	  var styles = [
	  {
		featureType: 'water',
		stylers: [
		  { color: '#19a0d8' }
		]
	  },{
		featureType: 'administrative',
		elementType: 'labels.text.stroke',
		stylers: [
		  { color: '#ffffff' },
		  { weight: 6 }
		]
	  },{
		featureType: 'administrative',
		elementType: 'labels.text.fill',
		stylers: [
		  { color: '#e85113' }
		]
	  },{
		featureType: 'road.highway',
		elementType: 'geometry.stroke',
		stylers: [
		  { color: '#efe9e4' },
		  { lightness: -40 }
		]
	  },{
		featureType: 'transit.station',
		stylers: [
		  { weight: 9 },
		  { hue: '#e85113' }
		]
	  },{
		featureType: 'road.highway',
		elementType: 'labels.icon',
		stylers: [
		  { visibility: 'on' }
		]
	  },{
		featureType: 'water',
		elementType: 'labels.text.stroke',
		stylers: [
		  { lightness: 100 }
		]
	  },{
		featureType: 'water',
		elementType: 'labels.text.fill',
		stylers: [
		  { lightness: -100 }
		]
	  },{
		featureType: 'poi',
		elementType: 'geometry',
		stylers: [
		  { visibility: 'on' },
		  { color: '#f0e4d3' }
		]
	  },{
		featureType: 'road.highway',
		elementType: 'geometry.fill',
		stylers: [
		  { color: '#efe9e4' },
		  { lightness: -25 }
		]
	  }
	];
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat:  28.613939, lng: 77.209021},
        zoom: 13,
        styles: styles,
        mapTypeControl: false
    });
    ko.applyBindings(new AppViewModel());

}

String.prototype.contains = function (other) {
    return this.indexOf(other) !== -1;
};

//Knockout's View Model
var AppViewModel = function () {
    var self = this;
    self.rollupIconPath = ko.observable('img/collapseIcon.png');
	self.listVisible = ko.observable(1);
	
    function initialize() {
        fetchrestaurants();
    }

    defaultIcon = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
	highlightedIcon = "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
	var infoWindow = new google.maps.InfoWindow();
	google.maps.event.addDomListener(window, 'load', initialize);
    self.restaurantList = ko.observableArray([]);
    self.query = ko.observable('');
    self.queryResult = ko.observable('');


    //List of restaurant's after filter based on query added in search
    self.FilteredrestaurantList = ko.computed(function () {
        self.restaurantList().forEach(function (restaurant) {
            restaurant.marker.setMap(null);
        });

        var results = ko.utils.arrayFilter(self.restaurantList(), function (restaurant) {
		   return restaurant.name.toLowerCase().contains(self.query().toLowerCase());
        });

        results.forEach(function (restaurant) {
            restaurant.marker.setMap(map);
        });
        if (results.length > 0) {
            if (results.length == 1) {
                self.queryResult(results.length + " restaurant");
            } else {
                self.queryResult(results.length + " restaurants");
            }
        }
        else {
            self.queryResult("No restaurant available");
        }
        return results;
    });
    self.queryResult("Loading restaurants, Please wait...");

    //function use when a restaurant is clicked from the filtered list
    self.selectrestaurant = function (restaurant) {
        infoWindow.setContent(restaurant.formattedInfoWindowData());
        infoWindow.open(map, restaurant.marker);
        map.panTo(restaurant.marker.position);
        restaurant.marker.setAnimation(google.maps.Animation.BOUNCE);
        restaurant.marker.setIcon(highlightedIcon);
        self.restaurantList().forEach(function (unselected_restaurant) {
            if (restaurant != unselected_restaurant) {
                unselected_restaurant.marker.setAnimation(null);
                unselected_restaurant.marker.setIcon(defaultIcon);
            }
        });
    };

    //function use for fetch restaurants.
    function fetchrestaurants() {
        var data;
        $.ajax({
            url: 'https://api.foursquare.com/v2/venues/search',
            dataType: 'json',
            data: 'client_id=LEX5UAPSLDFGAG0CAARCTPRC4KUQ0LZ1GZSB4JE0GSSGQW3A&client_secret=0QUGSWLF4DJG5TM2KO3YCUXUB2IJUCHDNSZC0FUUA3PKV0MY&v=20170101&ll=28.613939,77.209021&query=restaurant',
            async: true,
        }).done(function (response) {
            data = response.response.venues;
            data.forEach(function (restaurant) {
                var foursquare = new Foursquare(restaurant, map);
                self.restaurantList.push(foursquare);
            });
            self.restaurantList().forEach(function (restaurant) {
                if (restaurant.map_location()) {
                    google.maps.event.addListener(restaurant.marker, 'click', function () {
                        self.selectrestaurant(restaurant);
                    });
                }
            });
        }).fail(function (response, status, error) {
			self.queryResult('restaurant\'s could not load...');
        });
    }
	
	//shows or hides the list. Fired by clicks on our rollup icon.
    self.toggleList = function(makeVisible){

        if (typeof makeVisible !== 'boolean') {
            if (self.listVisible() === 0) {
                makeVisible = true;
            }
            else {
                makeVisible = false;
            }
        }

        //change actual list now that we know if we are hiding or showing
        if(makeVisible == true){
            self.listVisible(1);
            self.rollupIconPath('img/collapseIcon.png');
        }
        else if (makeVisible == false){
            self.listVisible(0);
            self.rollupIconPath('img/expandIcon.png');
        }

    };
};

//Callback function use for display info of foursquare model.
var Foursquare = function (restaurant, map) {
    var self = this;
    self.name = restaurant.name;
    self.location = restaurant.location;
    self.lat = self.location.lat;
    self.lng = self.location.lng;
    //map_location returns a computed observable of latitude and longitude
    self.map_location = ko.computed(function () {
        if (self.lat === 0 || self.lon === 0) {
            return null;
        } else {
            return new google.maps.LatLng(self.lat, self.lng);
        }
    });
    self.formattedAddress = ko.observable(self.location.formattedAddress);
    self.marker = (function (restaurant) {
        var marker;
        if (restaurant.map_location()) {
            marker = new google.maps.Marker({
                position: restaurant.map_location(),
                map: map,
                icon: defaultIcon
            });
        }
        return marker;
    })(self);
    self.id = ko.observable(restaurant.id);
    self.url = ko.observable(restaurant.url);
    self.formattedInfoWindowData = function () {
        return '<div class="info-window-content">' + '<a href="' + (self.url()===undefined?'#':self.url()) + '">' +
            '<span class="info-window-header"><h6>' + (self.name===undefined?'restaurant name not available':self.name) + '</h6></span>' +
            '</a><h6>' + (self.formattedAddress()===undefined?'No address available':self.formattedAddress())  + '</h6>' + '</div>';
    };
};



