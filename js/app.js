var map, infoWindow, defaultMarker, hoverMarker;

//init google map
var Map = function() {
	if ( typeof google != 'object' || typeof google.maps != 'object') {
		window.alert('Load Google Map Failed!')
		$('.search-area').hide();
		return false;
	}

	var mapOptions = {
		center: {lat: 40.7413549, lng: -73.9980244},
        zoom: 13,
        mapTypeControl: false
	};

	map = new google.maps.Map(document.getElementById('map'), mapOptions);

	infoWindow = new google.maps.InfoWindow({
		maxWidth: 240
	});

	defaultMarker = {
        url: 'imgs/marker-default.png',
        scaledSize: new google.maps.Size(32, 32),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(16, 32)
    }

    hoverMarker = {
        url: 'imgs/marker-hover.png',
        scaledSize: new google.maps.Size(32, 32),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(16, 32)
    }

	return true;
};

//init view model
var ViewModel = function() {
	this.shouldShowNavPanel = ko.observable(false);
	this.shouldShowNavButton = ko.observable(true);
	this.showPanel = function() {
		this.shouldShowNavButton(false);
		this.shouldShowNavPanel(true);
	}
	this.hidePanel = function() {
		this.shouldShowNavPanel(false);
		this.shouldShowNavButton(true);
	}
	var self = this;
	//init location format
	this.Location = function(title, lat, lng, keyWords) {
		this.title = ko.observable(title);
		this.lat = ko.observable(lat);
		this.lng = ko.observable(lng);
		this.keyWords = ko.observableArray(keyWords);

		this.marker = new google.maps.Marker({
			position: new google.maps.LatLng(lat, lng),
			animation: google.maps.Animation.DROP,
			title: title,
			icon: defaultMarker
		});

		this.wikiInfo = ko.observable('');

		var temp = this;

		this.info = ko.computed(function(){
			return '<div>'+
						'<h3>' + temp.title() + '</h3>'+
						'<div><p>'+
							temp.keyWords().join(', ')+'<br><br>'+
							temp.wikiInfo()+'<br>'+
						'</p></div>'+
					'</div>';
		});

		this.marker.addListener('mouseover', function() {
			this.setIcon(hoverMarker);
		});

		this.marker.addListener('mouseout', function() {
			this.setIcon(defaultMarker);
		});

		this.marker.addListener('click', function() {
			temp.reveal();
		});

		this.reveal = function() {
			map.setCenter(temp.marker.getPosition());
			infoWindow.setContent(temp.info());
			infoWindow.open(map, temp.marker);
		};

		this.marker.setMap(map);
	};

	//generate all locations
	this.generateLocationList = function() {

		var locations = [], keyWords = [];

		keyWords = ['park', 'ave', 'house'];
		locations.push(ko.observable(new self.Location('Park Ave Penthouse', 40.7713024, -73.9632393, keyWords)));
		keyWords = ['chelsea', 'loft'];
		locations.push(ko.observable(new self.Location('Chelsea Loft', 40.7444883, -73.9949465, keyWords)));
		keyWords = ['square', 'floor'];
		locations.push(ko.observable(new self.Location('Union Square Open Floor Plan', 40.7347062, -73.9895759, keyWords)));
		keyWords = ['studio', 'village', 'east'];
		locations.push(ko.observable(new self.Location('East Village Hip Studio', 40.7281777, -73.984377, keyWords)));
		keyWords = ['artsy', 'pad', 'bachelor'];
		locations.push(ko.observable(new self.Location('TriBeCa Artsy Bachelor Pad', 40.7195264, -74.0089934, keyWords)));
		keyWords = ['Homey', 'space', 'Chinatown'];
		locations.push(ko.observable(new self.Location('Chinatown Homey Space', 40.7180628, -73.9961237, keyWords)));

		return locations;
	};
	this.allLocations = ko.observable(this.generateLocationList());

	//generate filtered locations
	var defaultString = '';
	this.searchString = ko.observable(defaultString);
	this.locations = ko.computed(function() {

		var filteredLocations = ko.observableArray();
		var filter = self.searchString().toLowerCase();

		self.allLocations().forEach(function(location) {
			//filter input
			location().marker.setVisible(false);
			if ( location().title().toLowerCase().indexOf(filter) != -1 || self.searchString() === defaultString) {
				filteredLocations.push(location());
				location().marker.setVisible(true);
			}
			//filter keywords
			else {
				var words  = location().keyWords();
				for (var i = 0; i < words.length; i++) {
					if (words[i].toLowerCase().indexOf(filter) != -1) {
						filteredLocations.push(location());
						location().marker.setVisible(true);
						break;
					}
				}
			}
		});
		return filteredLocations();
	});

	//init wikipedia
	this.wikipedia = function () {
		var wikipediaRequest = function(index) {
			//requst failed
			var wikiRequestTimeout = setTimeout(function(){
				self.locations()[index].wikiInfo('Requst Error.<br>');
			}, 8000);

			$.ajax({
				url: wikiUrl,
				dataType: 'jsonp',
				success: function(response){
					var newWikiInfo = self.locations()[index].wikiInfo();
					newWikiInfo = newWikiInfo.concat('Wikipedia:');
					newWikiInfo = newWikiInfo.concat('<ul>');

					var articleList = response.query.search;

					if(articleList.length > 0) {
						//show articles
						for (var j=0; j<articleList.length; j++) {
							if (j > 2) {
								break;
							}
							var title = articleList[j].title;
							var timestamp = articleList[j].timestamp;
							var snippet = articleList[j].snippet;
							newWikiInfo = newWikiInfo.concat('<li><b>' + title + '</b><br><em>' + timestamp + '</em><br>' + snippet + '</li>');
						}
			            clearTimeout(wikiRequestTimeout);
						newWikiInfo = newWikiInfo.concat('</ul>');
						self.locations()[index].wikiInfo(newWikiInfo);
					} else {
						//no articles to show
						clearTimeout(wikiRequestTimeout);
						newWikiInfo = newWikiInfo.concat('<li>no related articles</li></ul>');
						self.locations()[index].wikiInfo(newWikiInfo);
					}
				},
				error: function() {
					window.alert('wikipedia request failed!');
				}
			});
		};

		for (var i=0; i<self.locations().length; i++) {
			var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + self.locations()[i].title() + '&format=json&callback=wikiCallBack';
			wikipediaRequest(i);
		}
	};
	this.wikipedia();

};

$(function() {
	if(Map()) {
		ko.applyBindings(new ViewModel());
	}
});
