#!/usr/bin/env node
/**
 * Generates tracks.json and art.json from the KLADG assets directory.
 * Also copies and lists art images for public/art/.
 *
 * Usage: node tools/generate-data.js
 */

import { readdir, writeFile, copyFile, stat } from 'fs/promises'
import { execSync } from 'child_process'
import { join, parse, extname } from 'path'

const ASSETS_DIR = './KLADG assets'
const MUSIC_DIR = join(ASSETS_DIR, 'music')
const ART_DIR = join(ASSETS_DIR, 'coverArt')
const OUT_TRACKS = './src/data/tracks.json'
const OUT_ART = './src/data/art.json'
const PUBLIC_ART = './public/art'
const PUBLIC_MUSIC = './public/music'

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getDuration(filepath) {
  try {
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`,
      { encoding: 'utf8' }
    )
    return Math.round(parseFloat(result.trim()))
  } catch {
    return 0
  }
}

async function main() {
  // Process art files
  const artFiles = (await readdir(ART_DIR))
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort()

  const artData = artFiles.map((filename, i) => {
    const id = `art-${String(i + 1).padStart(3, '0')}`
    const ext = extname(filename).toLowerCase()
    const newFilename = `${id}${ext}`
    return { id, filename: newFilename, originalFilename: filename }
  })

  // Copy art files to public/art with normalized names
  for (const art of artData) {
    const src = join(ART_DIR, art.originalFilename)
    const dest = join(PUBLIC_ART, art.filename)
    await copyFile(src, dest)
  }
  console.log(`Copied ${artData.length} art images to public/art/`)

  // Write art.json (without originalFilename)
  const artJson = artData.map(({ id, filename }) => ({ id, filename }))
  await writeFile(OUT_ART, JSON.stringify(artJson, null, 2))
  console.log(`Wrote ${OUT_ART}`)

  // Process music files
  const musicFiles = (await readdir(MUSIC_DIR))
    .filter(f => /\.(m4a|mp3|mp4)$/i.test(f))
    .sort()

  // Copy music files to public/music with normalized names for local dev
  const { mkdir } = await import('fs/promises')
  await mkdir(PUBLIC_MUSIC, { recursive: true })

  const tracks = []
  for (let i = 0; i < musicFiles.length; i++) {
    const filename = musicFiles[i]
    const { name, ext } = parse(filename)
    const id = slugify(name)
    const title = name.trim()
    const duration = getDuration(join(MUSIC_DIR, filename))

    // Copy to public/music for local dev
    const localFilename = `${id}${ext}`
    await copyFile(join(MUSIC_DIR, filename), join(PUBLIC_MUSIC, localFilename))

    // Assign a random art piece
    const artIndex = Math.floor(Math.random() * artData.length)
    const artId = artData[artIndex].id

    tracks.push({
      id,
      title,
      duration,
      localUrl: `/music/${localFilename}`,
      archiveUrl: '',
      artId,
      tags: []
    })
  }

  await writeFile(OUT_TRACKS, JSON.stringify(tracks, null, 2))
  console.log(`Wrote ${OUT_TRACKS} with ${tracks.length} tracks`)
  console.log(`Copied music files to public/music/ for local dev`)
}

main().catch(console.error)
