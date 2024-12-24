module.exports = {
    publishers: [
      {
        name: '@electron-forge/publisher-github',
        config: {
          repository: {
            owner: 'machaojin1917939763',
            name: 'chat_plus'
          },
          prerelease: false,
          draft: true
        }
      }
    ]
  }