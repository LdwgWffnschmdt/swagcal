module.exports = {
  devServer: {
    proxy: {
      "/owa": {
        target: 'https://outlook.live.com'
      },
      "/downloads": {
        target: 'http://de-kalender.de',
        secure: false
      },
      "/calendar": {
        target: 'https://calendar.google.com'
      },
      "/forecast": {
        target: 'https://api.darksky.net'
      }
    }
  }
}