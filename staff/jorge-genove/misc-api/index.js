require('dotenv').config()

const { PORT, SECRET } = process.env

const express = require('express')
const { register, login, retrieveUser, addContact, searchUsers, unregisterUser,retrieveContact } = require('./logic')
const { users: { update } } = require("./data")
const bodyParser = require('body-parser')
const { name, version } = require('./package.json')
const jwt = require('jsonwebtoken')
const { JsonWebTokenError } = jwt

const app = express()

const parseBody = bodyParser.json()

// users

app.post('/users', parseBody, (req, res) => {
    const { body: { name, surname, email, password } } = req

    try {
        register(name, surname, email, password, error => {
            if (error) return res.status(409).json({ error: error.message })

            res.status(201).send()
        })
    } catch (error) {
        res.status(406).json({ error: error.message })
    }
})

app.post('/users/auth', parseBody, (req, res) => {
    const { body: { email, password } } = req

    try {
        login(email, password, (error, userId) => {
            if (error) return res.status(401).json({ error: error.message })

            const token = jwt.sign({ sub: userId }, SECRET, { esxpiresIn: '1d' })

            res.send({ token })

        })
    } catch (error) {
        res.status(406).json({ error: error.message })
    }
})

app.get('/users/id:userId?', (req, res) => {
    // TODO extract userId from authorization (bearer token) then retrieve user and send it back
    try {

        const [, token] = req.header('authorization').split('')

        let { sub: userId } = jwt.verify(token, SECRET)

        const { params: { userId: _userId } } = req
        if (_userId) {
            userId = _userId
        }
        retrieveUser(userId, (error, user) => {
            if (error) return res.status(400).json({ error: error.message })

            res.send(user)
        })

    } catch (error) {
        if (error instanceof JsonWebTokenError) res.status(401)

        else res.status(406).json({ error: error.message })
    }
}
)

app.get('/users/q=query?', (req, res) => {
    try {
        const [, token] = req.header('authorization').split(' ')

        const { sub: userId } = jwt.verify(token, SECRET)

        const { params: { query } } = req

        searchUsers(userId, query, (error, users) => {
            if (error) return res.status(400).json({ error: error.message })

            res.send(users)
        })
    } catch (error) {
        if (error instanceof JsonWebTokenError) res.status(401)

        else res.status(406).json({ error: error.message })
    }
})

app.delete('/user/delete', parseBody, (req, res) => {

    try {
        const [, token] = req.header('authorization').split(' ')

        const { sub: userId } = jwt.verify(token, SECRET)

        const { body: { email, password } } = req

        unregisterUser(email, password, userId, (error) => {
            if (error) return res.status(403).json({ error: error.message })
            res.status(204).send()
        })
    } catch (error) {
        if (error instanceof JsonWebTokenError) res.status(401).send()

        else
            res.status(406).json({ error: error.message })
    }
})

app.patch('/users/update', parseBody, (req, res) => {
    try {
        const [, token] = req.header('authorization').split(' ')

        const { sub: userId } = jwt.verify(token, SECRET)

        const { body } = req

        update(userId, body, error => {
            if (error) return res.status(403).json({ error: error.message })

            res.send({ "message": 'user updated' })
        })
    } catch (error) {
        if (error instanceof JsonWebTokenError)
            res.status(401).send()
        else
            res.status(406).json({ error: error.message })
    }
})


// contacts

app.post('/contacts', parseBody, (req, res) => {

    try {

        const [, token] = req.header('authorization').split(' ')

        const { sub: userId } = jwt.verify(token, SECRET)

        const { body: contact } = req

        addContact(userId, contact, (error, contactId) => {
            if (error) return res.status(401).json({ error: error.message })

            res.send({ contactId })
        })
    } catch (error) {
        if (error instanceof JsonWebTokenError)
            res.status(401).send()
        else
            res.status(406).json({ error: error.message })
    }
})

app.get('/contacts/contactsId:contactId', (req, res) => {
try{
    const [, token] = req.header('authorization').split(' ')

    const { sub: userId } = jwt.verify(token, SECRET)

    const { params : { contactId } }= req

    retrieveContact(contactId, (error, [users] ) => {
        if (error) return res.status(401).json({error : error.message})

        res.send({users})
    })
    
    }catch(error) {
        if (error instanceof JsonWebTokenError)
            res.status(401).send()
        else
            res.status(406).json({error: error.message})
    }

})

app.delete('/contacts/delete', bodyParser, (req, res) => {
    try{
        const [, token] = req.header('authorization').split(' ')

        const  { sub: userId } = jwt.verify(token,SECRET)

        const {params : { contactId } } = req

        deleteContact(userId, contactId, (error) => {

        })
    }catch(error){
        if(error instanceof JsonWebTokenError)
            res.status(401).send()
        else
            res.status(406).json({error: error.message})
    }
})
// other

app.get('*', (req, res) => {
    res.status(404).send('Not Found :(')
})

app.listen(8080, () => console.log(`${name} ${version} running in ${PORT}`))