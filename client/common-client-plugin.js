async function register ({ registerHook, peertubeHelpers }) {
  if (peertubeHelpers.isLoggedIn()) {
    registerHook({
      target: 'action:router.navigation-end',
      handler: async ({ path }) => {
        try {
          if (!/^\/admin\/plugins\/show\/peertube-plugin-webapp-manifest/.test(path)) {
            return
          }

          const submit = await waitForRendering('#content my-plugin-show-installed form input[type=submit]')

          const icons = [36, 48, 72, 96, 144, 192, 512].map(size => {
            const inputHidden = document.getElementById(`icon-${size}x${size}`)
            inputHidden.setAttribute('type', 'hidden')

            const preview = document.createElement('img')
            preview.setAttribute('style', `display:block;margin-top:5px;width:${size * 0.5}px`)
            preview.src = inputHidden.value

            const inputFile = document.createElement('input')
            inputFile.setAttribute('type', 'file')
            inputFile.setAttribute('title', '')
            inputFile.setAttribute('style', 'margin-left:10px;color:transparent')
            inputFile.setAttribute('name', inputHidden.id)
            inputFile.setAttribute('accept', 'image/png')
            inputFile.addEventListener('change', () => {
              const file = inputFile.files[0]
              if (file) {
                const reader = new FileReader()

                reader.addEventListener('load', () => {
                  preview.src = reader.result
                }, false)

                reader.readAsDataURL(file)

                inputHidden.value = `/plugins/webapp-manifest/router/${inputHidden.id}.png`
                inputHidden.dispatchEvent(new Event('input'))
              }
            })

            const formGroup = inputHidden.parentElement
            formGroup.appendChild(inputFile)
            formGroup.appendChild(preview)

            return inputFile
          })

          submit.addEventListener('click', async () => {
            const iconsData = new FormData()

            icons.forEach(({ name, files }) => {
              if (files[0]) {
                iconsData.append(name, files[0])
              }
            })

            await fetch('/plugins/webapp-manifest/router/icons', {
              method: 'POST',
              body: iconsData
            })

            let manifestData = {}
            submit
              .parentElement
              .querySelectorAll('input[type=text], input[type=hidden]')
              .forEach(({ id, value }) => {
                manifestData[id] = value
              })
            manifestData = JSON.stringify(manifestData)

            await fetch('/plugins/webapp-manifest/router/manifest', {
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
              },
              method: 'POST',
              body: manifestData
            })
          })
        } catch (error) {
          console.error(error)
        }
      }
    })
  }
}

async function waitForRendering (selector) {
  // Waiting for DOMContent updated with a timeout of 5 seconds
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(interval)
      reject(new Error('DOMContent cannot be loaded'))
    }, 5000)

    // Waiting for element in DOM
    const interval = setInterval(() => {
      if (document.querySelector(selector)) {
        clearTimeout(timeout)
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })

  return document.querySelector(selector)
}

export {
  register
}
