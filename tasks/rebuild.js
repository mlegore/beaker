const gulp = require('gulp')
const path = require('path')
const run = require('./util-run')

//(cd app && npm rebuild --runtime=electron --target=1.7.4 --disturl=https://atom.io/download/atom-shell --build-from-source); gulp build

gulp.task('rebuild-deps', async () => {
  // TODO read electron version
  const cwd = path.join(process.cwd(), 'app')
  console.log(cwd)
  await run(`electron-rebuild`, {cwd, shell: true})
})

gulp.task('rebuild', ['rebuild-deps', 'build'])
