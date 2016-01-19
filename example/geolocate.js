/*
  A command-line tool that prints your latitude,longitude.

    npm run geolocate
 */

if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(function (position) {
    var coords = position.coords;
    console.log(JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude
    }));
    window.close();
  }, bail);
} else {
  bail();
}

function bail (err) {
  if (process.env.NODE_ENV !== 'development') process.exit(1);
  else console.error(err || 'No geolocation supported');
}
