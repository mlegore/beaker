'use strict'

const gulp = require('gulp')
const start = require('./start-cli')

gulp.task('start', start)

gulp.task('inspect-brk', () => {
  process.env.inspect = 'break'
})

gulp.task('inspect', () => {
  process.env.inspect = 'true'
})

gulp.task('start-watch', ['watch', 'inspect'], start)
gulp.task('break', ['watch', 'inspect-brk'], start)
