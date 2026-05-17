const turf = require('@turf/turf');
const timingFeed = require('./timingFeed');
const sectors = require('../data/sectors.json');
const path = require('path');
const fs = require('fs');

class Engine {
  constructor() {
    this.trackGeoJSON = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'nurburgring_geojson.json'), 'utf8'));
    this.trackLine = this.trackGeoJSON.features ? this.trackGeoJSON.features[0] : this.trackGeoJSON;
    this.trackLengthKm = turf.length(this.trackLine, { units: 'kilometers' });
    
    // The JSON provides a total track length of 25.378 km
    const realLength = 25.378;
    const scale = this.trackLengthKm / realLength;
    
    this.sectorDistances = sectors.map(s => s.distanceKm * scale);
  }

  getInterpolatedPositions() {
    const carStates = timingFeed.getCarStates();
    const now = Date.now();
    const positions = [];

    Object.values(carStates).forEach(car => {
      const elapsed = now - car.lastSectorTime;
      let ratio = elapsed / car.expectedDurationMs;
      
      // Cap ratio to avoid going past the next sector before it officially triggers
      if (ratio > 0.99) ratio = 0.99;
      if (ratio < 0) ratio = 0;

      const currentSectorDist = this.sectorDistances[car.currentSectorIdx];
      let nextSectorIdx = (car.currentSectorIdx + 1) % this.sectorDistances.length;
      let nextSectorDist = this.sectorDistances[nextSectorIdx];

      if (nextSectorDist <= currentSectorDist) {
        nextSectorDist = this.trackLengthKm; // Wrapping around
      }

      let currentTrackDist = currentSectorDist + ratio * (nextSectorDist - currentSectorDist);
      
      // Calculate coordinates
      const currentPoint = turf.along(this.trackLine, currentTrackDist, { units: 'kilometers' });
      
      // Calculate bearing
      let aheadDist = currentTrackDist + 0.05;
      if (aheadDist > this.trackLengthKm) {
        aheadDist -= this.trackLengthKm; // Wrap around for bearing
      }
      const pointAhead = turf.along(this.trackLine, aheadDist, { units: 'kilometers' });
      const bearing = turf.bearing(currentPoint, pointAhead);

      positions.push({
        id: car.id,
        number: car.number,
        class: car.class,
        driver: car.driver,
        carModel: car.carModel,
        lastLapTime: car.lastLapTime,
        gap: car.gap,
        interval: car.interval,
        laps: car.laps,
        inPit: car.inPit,
        position: car.position,
        classPosition: car.classPosition,
        speed: car.speed,
        lng: currentPoint.geometry.coordinates[0],
        lat: currentPoint.geometry.coordinates[1],
        bearing: bearing
      });
    });

    return {
      positions: positions,
      code60Sectors: timingFeed.getCode60Sectors()
    };
  }
}

module.exports = new Engine();
