function dark() {
    localStorage.setItem('theme', 'dark-v10');
}

function light() {
    localStorage.setItem('theme', 'light-v10');
}

function toggleTheme() {
    let currentTheme = localStorage.getItem('theme');
    if (!currentTheme || currentTheme.startsWith('light')) {
        dark();
    } else {
        light();
    }
    window.location.reload();
}


function toggleView() {
    let currentView = localStorage.getItem('view');
    if (!currentView || currentView.startsWith('grouped')) {
        localStorage.setItem('view', 'clustered');
    } else {
        localStorage.setItem('view', 'grouped');
    }
    window.location.reload();
}

$(document).ready(function() {
    // set the dark as default
    let currentTheme = localStorage.getItem('theme');
    if (!currentTheme) {
        dark();
        currentTheme = localStorage.getItem('theme');
    }

    // it can be clustered / grouped
    let currentView = localStorage.getItem('view') || 'grouped';

    let defaultPosition = [22.5, 73];
    let defaultZ = currentView === 'grouped' ? 6 : 5;
    let map = L.map('map', { attributionControl: false });
    map.setView(defaultPosition, defaultZ);

    let credits = L.control.attribution().addTo(map);
    credits.addAttribution('Made with <i class="fas fa-heart"></i> by Pavithra B');

    let mapbox_api_key = "pk.eyJ1IjoiYXNod2FudGhrdW1hciIsImEiOiJja3ZqaWRiMnIwcjNxMnZtdGMzdDV6NXd6In0.mnROzgnUQY5wheUA7i0HHA";
    let dark_bm = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/' + currentTheme + '/tiles/256/{z}/{x}/{y}?' +
        'access_token=' + mapbox_api_key, { maxNativeZoom: 18, maxZoom: 19 }
    );
    dark_bm.addTo(map);

    // add theme toggle button on the map
    let buttonClass = currentTheme && currentTheme.startsWith('dark') ? 'fa-toggle-off' : 'fa-toggle-on'
    let toggleButtonTitle = currentTheme && currentTheme.startsWith('dark') ? 'Switch to Light' : 'Switch to Dark'
    L.easyButton(buttonClass, function() {
        toggleTheme();
    }, toggleButtonTitle).addTo(map);


    // add view toggle button on the map
    L.easyButton('fa-users-cog', function() {
        toggleView();
    }, 'Change View').addTo(map);

    // add view toggle button on the map
    L.easyButton('fa-user-plus', function() {
        window.open('https://docs.google.com/spreadsheets/d/1inOlpl1oS7AYQpcGSMVH7WmQMMDmyRCrkVmWihc4KpU/edit#gid=0', '_new');
    }, 'Add Members').addTo(map);

    // Reset Map view
    L.easyButton('fa-crosshairs', function(btn, map) {
        map.setView(defaultPosition, defaultZ);
    }).addTo(map);

    // NB: Might want to delete this URL with the API Key after the demo / it has served it's purpose
    let spreadsheetURL = "https://sheets.googleapis.com/v4/spreadsheets/1inOlpl1oS7AYQpcGSMVH7WmQMMDmyRCrkVmWihc4KpU/values/Names!A2:Z1000?key=AIzaSyDkKyiAAQ8KCGVhHtNoAvTgliOk4kw6moc";

    $.getJSON(spreadsheetURL, function(result) {
        let members = result.values.map(function(row) {
            return {
                name: row[0],
                city: row[1],
                state: row[2],
                latitude: row[3],
                longitude: row[4],
            }
        });

        if (currentView === 'grouped') {
            addMarkersByGroupingMembersByCity(members, map);
        } else {
            addMarkersByCluster(members, map);
        }
    });
});

function addMarkersByCluster(members, map) {
    let markers = L.markerClusterGroup();
    let pops = [];

    members.map(function(member) {
        let popupContent = `<div><h4>${member.name}</h4></div>`;
        let marker = L.marker([member.latitude, member.longitude]);
        let p = new L.Popup({ autoClose: false, closeOnClick: false }).setContent(popupContent);
        pops.push(marker.bindPopup(p));
        markers.addLayer(marker);
    });

    map.addLayer(markers);

    // Ref - https://stackoverflow.com/a/48559308
    map.on('layeradd', function(event) {
        let layer = event.layer;
        if (layer instanceof L.Marker && !(layer instanceof L.MarkerCluster)) {
            layer.openPopup();
        }
    });

    // attempt to pre-open the pop-ups wherever possible
    pops.forEach(function(p) {
        p.openPopup();
    });
}

function addMarkersByGroupingMembersByCity(members, map) {
    let groupedMembersByCity = _.groupBy(members, 'city');
    let cities = _.allKeys(groupedMembersByCity).map(function(city) {
        let membersInCurrentCity = groupedMembersByCity[city];
        let first = _.head(membersInCurrentCity);
        return {
            city: first.city,
            latitude: first.latitude,
            longitude: first.longitude,
        }
    });
    let cityToLatLongs = cities.reduce((obj, item) => (obj[item.city] = item, obj), {});

    _.allKeys(groupedMembersByCity).map(function(city) {
        let membersInCurrentCity = groupedMembersByCity[city];
        let name = membersInCurrentCity.map(function(member) {
            return member.name
        }).join("<br>");

        let cityPosition = cityToLatLongs[city];

        let popupContent = `<div><h4>${name}</h4></div>`;
        let pos = [cityPosition.latitude, cityPosition.longitude];
        let marker = L.marker(pos);
        let p = new L.Popup({ autoClose: false, closeOnClick: false })
            .setContent(popupContent);
        marker.bindPopup(p).addTo(map).openPopup();
    });
}