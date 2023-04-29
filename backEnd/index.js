import './util/config.js'
import express from 'express'
import cloudinary from 'cloudinary'
// v2 und upload_stream
// import  { v2  as cloudinary } from 'cloudinary'
import multer from 'multer'
// ! wollen Bilder im Buffer speichern und direkt zu cloudinary schieben
import cors from 'cors'
import morgan from 'morgan'
import { getDb } from './util/db.js'
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { request } from 'http'
import { buffer } from 'stream/consumers'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const BACKEND_PORT = process.env.BACKEND_PORT
const app = express()



    const upload = multer({

        limits: {
            fileSize: 1 * 1024 * 1024
        },

        // validieren mit Joi -> die Datei die hochgeladen wird wird geprüft
        // ob es ein Bild ist     und ob es die richtige Größe hat
        fileFilter: (req, file, cb) => {

            console.log(req.headers['content-length'])
            console.log(file)

            // ! schema definieren
            const schema = Joi.object({

                bildGroesse: Joi.number().max(1 * 1024 * 1024).required(),
                mimetype: Joi.string().valid('image/png', 'image/jpeg', 'image/jpg').required()
            })

            // ! schema validieren    definition    mit    den   datenOrten 
            const { error, value } = schema.validate({
                bildGroesse: req.headers['content-length'],
                mimetype: file.mimetype
            },
                // ! abortEarly: false -> alle Fehler werden angezeigt
                { abortEarly: false })

            if (error) {
                const errorMessages = error.details.map(detail => detail.message)
                cb(new Error(`Fehler beim Hochladen: ${errorMessages.join(', ')}`), 422)
                // cb(new Error(`Fehler beim Hochladen: ${error.message}`))
                //   cb(new Error(`Fehler beim Hochladen: ${error.details}`), 422)    
                // ! , 422 -> fügt einen Status Error code hinzu     error.status = 422
            }
            else {
                cb(null, true)
            }
        },
        storage: multer.memoryStorage()
    })




app.use(morgan('dev'))
const CORS_WHITELIST = process.env.CORS_WHITELIST
app.use(cors({
    origin: (origin, cb) => {
        if (CORS_WHITELIST.indexOf(origin) !== -1) {
            cb(null, true)
        }
        else {
            cb(new Error('Nicht erlaubt durch CORS, nicht auf Whitelist'))
        }
    }
}))

app.use((err, req, res, next) => {
    console.log(err.message)  // Zeigt nur die Fehlermeldung
    console.log(err.stack)   // Zeigt die komplette Fehler-Baum und verlauf an
    if (err) {
        res.status(500).json({ message: `CORS Fehler gefangen: 599 ${err.message} Stack: ${err.stack}` })
    }
    else {
        next()
    }
})


app.use(express.json())

// Route directupload
// wollen Bilder im Buffer speichern mit multer 
// holen dann die Bilder vom Buffer, speichern sie direkt in Cloudinary ohne das sie auf Server gespeichert werden
// wir holen von Cloudinary die secure_url raus 
// die secure_url speichern wir in der MongoDB als imgUrl 
app.post('/directupload', upload.single('file'), async (req, res) => {
    console.log(req.file)
    try {
        cloudinary.v2.uploader.upload_stream({ resource_type: 'image', folder: 'imageOrdner' }, async (err, result) => {
            console.log(err)
            console.log(result)

            // Validierung mit Joi ob die daten die wir bekommen haben richtig sind
            // wenn nicht dann wird ein Fehler geworfen
            // wenn ja dann wird das Bild in der MongoDB gespeichert

            // ! schema definieren
            const schema = Joi.object({
                name: Joi.string().min(3).max(30).required(),
                imgUrl: Joi.string().uri().required()
            })

            // ! schema validieren
            const { error, value } = schema.validate({ name: req.body.name, imgUrl: result.secure_url })

            // ! wenn ein Fehler auftritt dann wird ein Fehler geworfen
            if (error) {
                throw new Error(`Fehler beim Hochladen: ${error.message}`)
            }

            const db = await getDb()
            db.collection('malbilder').insertOne({ name: req.body.name, imgUrl: result.secure_url })
            res.status(201).json({ message: 'Bild erfolgreich hochgeladen', url: result.secure_url })
        }).end(req.file.buffer)

    } catch (err) {
        console.log(err)
        res.status(500).json({ message: `Fehler beim Hochladen: ${err.message}` })
    }
})

/* app.post('/directupload', upload.single('file'), async (req, res) => {
    console.log(req.file)
    try {
        const result = await cloudinary.uploader.upload(req.file.buffer, { resource_type: 'image', folder: 'imageOrdner' })
        console.log(result)
        const db = await getDb()
        db.collection('malbilder').insertOne({ name: req.body.name, imgUrl: result.secure_url })
        res.status(201).json({ message: 'Bild erfolgreich hochgeladen', url: result.secure_url })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: `Fehler beim Hochladen: ${err.message}` })
    }
}) */


// Server starten
app.listen(BACKEND_PORT, () => {
    console.log(`Server läuft auf Port: ${BACKEND_PORT}`)
})
// zum killen von Ports: lsof -i :Portnummer
// kill -9 <PID-Nummer>
