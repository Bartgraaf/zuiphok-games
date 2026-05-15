const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const withCleartextTraffic = (config) => {
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0]
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config'
    return config
  })

  config = withDangerousMod(config, [
    'android',
    (config) => {
      const xmlDir = path.join(
        config.modRequest.projectRoot,
        'android', 'app', 'src', 'main', 'res', 'xml'
      )
      fs.mkdirSync(xmlDir, { recursive: true })
      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`
      )
      return config
    },
  ])

  return config
}

module.exports = withCleartextTraffic
