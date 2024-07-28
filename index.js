const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

const hasuraAxios = axios.create({
    baseURL: HASURA_GRAPHQL_ENDPOINT,
    headers: {
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        'Content-Type': 'application/json',
    },
});

// Endpoint to handle deposits
app.post('/deposit', async (req, res) => {
    const { userId, amount } = req.body;

    try {
        await hasuraAxios.post('', {
            query: `
                mutation {
                    insert_transactions(objects: { user_id: ${userId}, type: "deposit", amount: ${amount} }) {
                        returning {
                            id
                        }
                    }
                    update_users(where: { id: { _eq: ${userId} } }, _inc: { balance: ${amount} }) {
                        affected_rows
                    }
                }
            `,
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to handle withdrawals
app.post('/withdraw', async (req, res) => {
    const { userId, amount } = req.body;

    try {
        const user = await hasuraAxios.post('', {
            query: `
                query {
                    users_by_pk(id: ${userId}) {
                        balance
                    }
                }
            `,
        });

        if (user.data.data.users_by_pk.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        await hasuraAxios.post('', {
            query: `
                mutation {
                    insert_transactions(objects: { user_id: ${userId}, type: "withdrawal", amount: ${amount} }) {
                        returning {
                            id
                        }
                    }
                    update_users(where: { id: { _eq: ${userId} } }, _inc: { balance: -${amount} }) {
                        affected_rows
                    }
                }
            `,
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
