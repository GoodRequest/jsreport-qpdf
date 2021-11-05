// const removePages = require('./removePages')
// const mergePdfs = require('./mergePdfs')
const parsePdf = require('./parsePdf')
// const addPages = require('./addPages')
const path = require('path')
const fs = require('fs')
const { v4 } = require('uuid')
const { exec } = require('child_process')
const os = require('os')
// const { addSignaturePlaceholder, sign } = require('./sign')
// const processText = require('./processText')
// const pdfjs = require('@jsreport/pdfjs')
// const PDF = require('@jsreport/pdfjs/lib/object')

const qpdfPath = process.env.QPDF_PATH || 'qpdf'

module.exports = (contentBuffer, { pdfMeta, pdfPassword, pdfSign, outlines, removeHiddenMarks } = {}) => {
  let currentBuffer = contentBuffer
  let currentlyParsedPdf
  let pagesHelpInfo = []

  return {
    async parse ({
      includeText = false,
      hiddenPageFields = {}
    } = {}) {
      currentlyParsedPdf = await parsePdf(currentBuffer, {
        hiddenPageFields,
        includeText
      })
      return currentlyParsedPdf
    },

    get parsedPdf () {
      return currentlyParsedPdf
    },

    async append (appendBuffer) {
      const curPDF = path.join(os.tmpdir(), 'jsreport', v4() + '.pdf')
      const appPDF = path.join(os.tmpdir(), 'jsreport', v4() + '.pdf')
      
      await Promise.all([
        fs.promises.writeFile(curPDF, currentBuffer, { encoding: 'binary' }),
        fs.promises.writeFile(appPDF, appendBuffer, { encoding: 'binary' })
      ])
      const final = path.join(os.tmpdir(), 'jsreport', v4() + '.pdf')

      await new Promise((resolve, reject) => {
        const cmd = `${qpdfPath} --empty --pages ${[curPDF, appPDF].join(' ')} -- ${final}`
        exec(cmd, (err, stdout, stderr) => {
          if(err) {
            return reject(stderr)
          }
          return resolve(stdout)
        })

      })
      const buf = await fs.promises.readFile(final)
      
      currentBuffer = buf
    },

    async prepend (prependBuffer) {
      const curPDF = path.join(os.tmpdir(), 'jsreport', v4() + '.pdf')
      const prepPDF = path.join(os.tmpdir(), 'jsreport', v4() + '.pdf')

      await Promise.all([
        fs.promises.writeFile(curPDF, currentBuffer, { encoding: 'binary' }),
        fs.promises.writeFile(appPDF, prependBuffer, { encoding: 'binary' })
      ])
      const final = path.join(os.tmpdir(), 'jsreport', v4() + 'pdf')
      await new Promise((resolve, reject) => {
        const cmd = `${qpdfPath} --empty --pages ${[prepPDF, curPDF].join(' ')} -- ${final}`
        exec(cmd, (err, stdout, stderr) => {
          if(err) {
            return reject(stderr)
          }
          return resolve(stdout)
        })

      })
      const buf = await fs.promises.readFile(final)
      
      currentBuffer = buf
    },
    // NOTE: not used now
    // async merge (pageBuffersOrDocBuffer, mergeToFront) {
    //   for (let i = 0; i < currentlyParsedPdf.pages.length; i++) {
    //     pagesHelpInfo[i] = pagesHelpInfo[i] || { xObjIndex: 0, removeContentBackLayer: true }
    //     pagesHelpInfo[i].xObjIndex++
    //   }

    //   if (Buffer.isBuffer(pageBuffersOrDocBuffer)) {
    //     currentBuffer = await mergePdfs.mergeDocument(currentBuffer, pageBuffersOrDocBuffer, mergeToFront, pagesHelpInfo)
    //   } else {
    //     currentBuffer = await mergePdfs.mergePages(currentBuffer, pageBuffersOrDocBuffer, mergeToFront, pagesHelpInfo)
    //   }

    //   pagesHelpInfo.forEach(i => (i.removeContentBackLayer = false))
    // },

    // async removePages (pageNumbers) {
    //   currentBuffer = await removePages(currentBuffer, pageNumbers)
    // },

    toBuffer () {
      return Promise.resolve(currentBuffer)
    },

    async postprocess ({
      hiddenPageFields
    }) {
      if (pdfPassword && pdfPassword.password) {

        const curPDF = path.join(os.tmpdir(), 'jsreport', v4() + '.pdf')
        const finalPDF = path.join(os.tmpdir(), 'jsreport', v4() + 'finalPass.pdf')
        await fs.promises.writeFile(curPDF, currentBuffer, { encoding: 'binary' })
  
        await new Promise((resolve, reject) => {
          const cmd = `${qpdfPath} --encrypt ${pdfPassword.password} ${pdfPassword.password} 256 -- ${curPDF} ${finalPDF}`
          exec(cmd, (err, stdout, stderr) => {
            if(err) {
              return reject(stderr)
            }
            return resolve(stdout)
          })
  
        })
        currentBuffer = await fs.promises.readFile(finalPDF)
      }
    }
  }
}