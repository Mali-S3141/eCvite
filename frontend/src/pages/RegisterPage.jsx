import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Button,
    Container,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import api from "../services/api";

export default function RegisterPage() {

    const navigate = useNavigate();
    const location = useLocation();

    const [emailError, setEmailError] = useState(false);

    const [user, setUser] = useState({
        firstNameMan: location.state?.name || "",
        firstNameWoman: "",
        lastName: "",
        phone: location.state?.phone || "",
        email: "",
        eventType: "",
        city: "",
        street: "",
        houseNumber: "",
    });


    const handleChange = (e) => {
        const { name, value } = e.target;

        setUser({
            ...user,
            [name]: value,
        });

        if (name === "email") {
            const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
            setEmailError(value !== "" && !gmailRegex.test(value));
        }
    };


    const handleRegister = async (e) => {
        e.preventDefault();

        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

        if (!gmailRegex.test(user.email)) {
            setEmailError(true);
            return;
        }

        try {
            await api.register(user);
            navigate("/login");
        } catch (err) {
            alert("ההרשמה נכשלה");
        }
    };


    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" align="center" gutterBottom>
                    הרשמה למערכת
                </Typography>

                <Box
                    component="form"
                    onSubmit={handleRegister}
                    display="flex"
                    flexDirection="column"
                    gap={2}
                >

                    <TextField
                        label="שם פרטי"
                        name="firstNameWoman"
                        value={user.firstNameWoman}
                        onChange={handleChange}
                    />

                    <TextField
                        label="שם משפחה"
                        name="lastName"
                        value={user.lastName}
                        onChange={handleChange}
                    />

                    <TextField
                        label="פלאפון"
                        name="phone"
                        value={user.phone}
                        onChange={handleChange}
                    />

                    <TextField
                        label="מייל"
                        name="email"
                        value={user.email}
                        onChange={handleChange}
                        required
                        error={emailError}
                        helperText={emailError ? "המייל שהוזן אינו תקין" : ""}
                    />

                    <TextField
                        select
                        label="עבור איזה שמחה?"
                        name="eventType"
                        value={user.eventType}
                        onChange={handleChange}
                    >
                        <MenuItem value="חתונה">חתונה</MenuItem>
                        <MenuItem value="בר מצווה">בר מצווה</MenuItem>
                        <MenuItem value="אחר">אחר</MenuItem>
                    </TextField>

                    <TextField
                        label="עיר"
                        name="city"
                        value={user.city}
                        onChange={handleChange}
                    />

                    <TextField
                        label="רחוב"
                        name="street"
                        value={user.street}
                        onChange={handleChange}
                    />

                    <TextField
                        label="מספר בית"
                        name="houseNumber"
                        value={user.houseNumber}
                        onChange={handleChange}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                    >
                        הרשמה
                    </Button>

                </Box>
            </Paper>
        </Container>
    );
}