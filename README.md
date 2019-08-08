<img height="128" src="https://raw.githubusercontent.com/LdwgWffnschmdt/swagcal/master/src/assets/logo.svg?sanitize=true">

# swagcal
This is a small project using [Vue](https://vuejs.org/) and [Vuetify](https://vuetifyjs.com/en/) to display a simple calendar with [weather](https://darksky.net/dev) and ical support. It is intended as a viewer only for example for a screen on the wall.

## configuration
You need to add a config.js file to the root of the project folder like this:
```javascript
module.exports = {
  darkSkyApiKey: 'xxx',             // Get a DarkSky key from https://darksky.net/dev
  weatherLocation: {                // Location for weather
    latitude: 50, 
    longitude: 6
  },
  calendars: [
    {
      name: "Some name",
      url: "http://link.to/calendar.ics",
      color: "green darken-4",      // Color code from vuetify or #rgb
      events: []                    // Ignore this
    },
    ...
  ]
}
```

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your tests
```
npm run test
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
