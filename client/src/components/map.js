import React from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const defaultContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 24.8607, // Example: Karachi latitude
  lng: 67.0011  // Example: Karachi longitude
};

function Map({containerStyle = defaultContainerStyle, center = defaultCenter, zoom = 10}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyCVqfLTuFwcGZkO_W7aNQzij-nL7mlVNy0' // Replace with your API key
  });

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
    >
      <Marker position={center} />
    </GoogleMap>
  );
}

export default Map;