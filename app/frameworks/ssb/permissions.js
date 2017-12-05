export default {
  publish: {
    desc: (param) => {
      if (param !== "*") return `publish '${param}' ssb message types`
      return `publish all ssb message types`
    },
    icon: 'publish',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: false,
  },
}
