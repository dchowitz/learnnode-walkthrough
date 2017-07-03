import axios from 'axios';
import { $ } from './bling';

const mapOptions = {
  center: { lat: 43.2, lng: -79.8 },
  zoom: 10
};

function loadPlaces(map, lat = 43.2, lng = -79.8) {
  axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) return;

      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();

      places.forEach(p => {
          const [lng, lat] = p.location.coordinates;
          const position = { lat, lng };
          bounds.extend(position);

          const marker = new google.maps.Marker({ map, position });
          marker.place = p;

          marker.addListener('click', function () {
            const html = `
              <div class="popup">
                <a href="/stores/${this.place.slug}">
                  <img src="/uploads/${this.place.photo || 'store.png'}" />
                  <p>${this.place.name} - ${this.place.location.address}</p>
                </a>
              </div>
            `;
            infoWindow.setContent(html);
            infoWindow.open(map, this);
          });
      })

      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    });
}

function makeMap(mapDiv) {
  if (!mapDiv) return;
  const map = new google.maps.Map(mapDiv, mapOptions);
  loadPlaces(map);

  const input = $('[name=geolocate]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    const location = place.geometry && place.geometry.location;
    if (!location) return;
    loadPlaces(map, location.lat(), location.lng());
  });
}

export default makeMap;