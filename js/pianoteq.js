export let apiUrl = localStorage['rc-pianoteq-api-url'] || 'https://local.pian.co/jsonrpc'

export async function setUrl() {
  const testUrl = async () => {
    return !!(await api('getInfo'))
  }
  let i = 0
  while(!await testUrl()) {
    apiUrl = window.prompt(
      'Set URL of Pianoteq JSON RPC API',
      localStorage['rc-pianoteq-api-url'] || 'http://127.0.0.1:8081/jsonrpc'
    )
    if (apiUrl === null) {
      break
    }
    localStorage['rc-pianoteq-api-url'] = apiUrl
    i++
  }
}

export async function api(method, params=[]) {
  if (!method) {
    return false
  }
  if (!apiUrl) {
    return false
  }
  const body = {
    jsonrpc: "2.0",
    method,
    params,
    id: 0,
  }
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      },
    })
    const response = await res.json()
    if ('result' in response) {
      return response.result || response.result === null
    } else {
      return false
    }
  } catch (e) {
    console.warn(e)
    return false
  }
}

// custom ordering and grouping of instruments with small number of presets
const groups = {
  "Grand Ant. Petrof": null,
  "Grand Petrof Mistral": null,
  "Grand Blüthner": null,
  "Grand C. Bechstein DG": null,
  "Other Pianos": [
    "Erard (1922)",
    "Pleyel (1926)",
    "CP-80",
  ],
  "Historical": [
    "J. Schantz (1790)",
    "J.E. Schmidt (1790)",
    "A. Walter (1790)",
    "D. Schöffstoss (1812)",
    "C. Graf (1826)",
  ],
  "Predecessor": [
    "Cimbalom",
    "Neupert Clavichord",
    "F.E. Blanchet Harpsichord (1733)",
    "C. Grimaldi Harpsichord (1697)",
  ],
  "Bells": [
    "Church Bells",
    "Tubular Bells",
  ],
}

export async function getCurrentPreset() {
  const response = await api('getInfo')
  if (response) {
    return response[0].current_preset.name
  }
  return null
}

export async function fetchPresets() {
  const list = await api('getListOfPresets')
  if (!list) {
    apiUrl = undefined
    return { "Setup": ["Set Pianoteq JSON RPC API URL"]}
  }
  const presets = new Set()
  list
    .filter(({ license_status }) => license_status === 'ok')
    .forEach(({
      name,
      instr: instrName,
    }) => {
      const instr = [...presets].find((i) => i.name === instrName) || {
        name: instrName,
        presets: [],
      }
      presets.add(instr)
      instr.presets.push(name)
    })
  return Object.entries(groups)
    .reduce((acc, [groupName, instrNames]) => {
      if (instrNames === null) {
        const instr = [...presets].find(({ name }) => name === groupName)
        if (instr) {
          acc[groupName.replace('Grand ', '')] = instr.presets
        } else {
          console.warn(`Instrument ${groupName} not found`) // mismatch
        }
      } else {
        acc[groupName] = instrNames
          .map(instrName => [...presets].find(({ name }) => name === instrName))
          .reduce((list, instr) => {
            const match = instr.name.match(/\((.*)\)/)
            return [
              ...list,
              ...(match ? [match[0]] : []),
              ...instr.presets,
            ]
          }, [])
      }
      return acc
    }, {})
}
