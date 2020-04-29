const { resolve } = require('path')
const { promises: { mkdir, rename, readFile, writeFile } } = require('fs')
const serveStatic = require('serve-static')
const fileUpload = require('express-fileupload')

async function getManifest ({ src } = { src: false }) {
  const path = resolve(process.cwd(), `./client/${src ? 'src' : 'dist'}/manifest.webmanifest`)
  const data = JSON.parse(await readFile(path, 'utf8'))
  const keys = Object.keys(data)

  return {
    path,
    data,
    keys
  }
}

function getStaticPath () {
  return resolve(__dirname, '../../assets/peertube-plugin-webapp-manifest/icons')
}

async function register ({
  registerSetting,
  getRouter,
  settingsManager
}) {
  if (typeof getRouter === 'undefined') {
    console.error(
      '[plugin-webapp-manifest]',
      new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      `${'\x1b[31m'}error${'\x1b[0m'}:`,
      'Cannot register webapp - manifest plugin, please upgrade PeerTube ')
    return
  }

  // Init staticDir icons
  await mkdir(getStaticPath(), {
    recursive: true
  })

  const manifest = await getManifest()

  const settings = {}

  await Promise.all(manifest.data.icons.map(({ sizes }) => {
    return settingsManager
      .getSetting(`icon-${sizes}`)
      .then(src => {
        settings[`icon-${sizes}`] = src
      })
  }))

  await Promise.all(manifest.keys.filter(key => key !== 'icons').map(key => {
    return settingsManager
      .getSetting(key)
      .then(value => {
        settings[key] = value
      })
  }))

  const updatedManifest = {}

  for (const key of manifest.keys) {
    if (key === 'icons') {
      updatedManifest.icons = []

      for (const icon of manifest.data.icons) {
        updatedManifest.icons.push({
          ...icon,
          src: settings[`icon-${icon.sizes}`] || icon.src
        })
      }

      manifest.data.icons.forEach(icon => {
        registerSetting({
          name: `icon-${icon.sizes}`,
          label: `icon-${icon.sizes}.png`,
          type: 'input',
          default: icon.src
        })
      })
    } else {
      updatedManifest[key] = settings[key] || manifest.data[key]

      registerSetting({
        name: key,
        label: key,
        type: 'input',
        default: manifest.data[key]
      })
    }
  }

  await writeFile(manifest.path, JSON.stringify(updatedManifest))

  const router = getRouter()

  router.use(serveStatic(getStaticPath()))

  router.use(fileUpload({
    useTempFiles: true,
    tempFileDir: resolve(__dirname, '../../../tmp/')
  }))

  router.post('/icons', async (req, res) => {
    try {
      if (req.files) {
        await Promise.all(Object.keys(req.files).map(key => {
          return rename(req.files[key].tempFilePath, resolve(getStaticPath(), `${key}.png`))
        }))
      }

      res.send()
    } catch (error) {
      res.status(500).send(error.message)
    }
  })

  router.post('/manifest', async (req, res) => {
    try {
      const manifest = await getManifest()

      const updatedManifest = {}
      manifest.keys.forEach(key => {
        if (key === 'icons') {
          updatedManifest.icons = manifest.data.icons.map(icon => ({
            ...icon,
            src: req.body[`icon-${icon.sizes}`] || icon.src
          }))
        } else {
          updatedManifest[key] = req.body[key]
        }
      })

      await writeFile(manifest.path, JSON.stringify(updatedManifest))

      res.send()
    } catch (error) {
      res.status(500).send(error.message)
    }
  })
}

async function unregister ({ getRouter }) {
  if (typeof getRouter === 'undefined') return

  const originalManifest = await getManifest({ src: true })

  const manifest = await getManifest()

  await writeFile(manifest.path, JSON.stringify(originalManifest.data))
}

module.exports = {
  register,
  unregister
}
