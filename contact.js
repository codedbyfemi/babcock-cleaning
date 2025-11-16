#!/usr/local/bin/node

/**
 * Babcock Cleaning - Contact Form CGI Handler (Node.js)
 * Processes booking requests and stores them in the database
 */

const mysql = require('mysql2/promise');
const querystring = require('querystring');

// Database configuration
const DB_CONFIG = {
    host: 'localhost',
    database: 'mydb',
    user: 'root',
    password: 'password',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

/**
 * Parse POST data from stdin
 */
function parsePostData() {
    return new Promise((resolve) => {
        let body = '';
        process.stdin.setEncoding('utf8');
        
        process.stdin.on('data', (chunk) => {
            body += chunk;
        });
        
        process.stdin.on('end', () => {
            const formData = querystring.parse(body);
            resolve(formData);
        });
    });
}

/**
 * Validate form data
 */
function validateFormData(formData) {
    const errors = [];
    const requiredFields = [
        'full_name', 'phone_number', 'email', 'city',
        'bedrooms', 'bathrooms', 'square_footage',
        'service_type', 'clean_date', 'source'
    ];
    
    // Check required fields
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].trim() === '') {
            errors.push(`Missing required field: ${field.replace('_', ' ')}`);
        }
    });
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
        errors.push('Invalid email address');
    }
    
    // Phone validation
    if (formData.phone_number && formData.phone_number.replace(/\D/g, '').length < 10) {
        errors.push('Phone number must be at least 10 digits');
    }
    
    return errors;
}

/**
 * Map service type to service ID
 */
function getServiceId(serviceType) {
    const serviceMap = {
        'deep_onetime': 1,
        'regular_weekly': 2,
        'regular_biweekly': 2,
        'move_out': 4
    };
    return serviceMap[serviceType] || 1;
}

/**
 * Format service type for display
 */
function formatServiceType(serviceType) {
    const formats = {
        'deep_onetime': 'Deep Cleaning / One Time',
        'regular_weekly': 'Regular Cleaning / Weekly',
        'regular_biweekly': 'Regular Cleaning / Bi-Weekly',
        'move_out': 'Move-in/Move-out Cleaning'
    };
    return formats[serviceType] || serviceType;
}

/**
 * Build detailed message from form data
 */
function buildMessage(formData) {
    const messageParts = [];
    
    // Property details
    messageParts.push('Property Details:');
    messageParts.push(`- Bedrooms: ${formData.bedrooms || '0'}`);
    messageParts.push(`- Bathrooms: ${formData.bathrooms || '0'}`);
    messageParts.push(`- Square Footage: ${formData.square_footage || '0'} sq ft`);
    
    // Service details
    messageParts.push('\nService Details:');
    messageParts.push(`- Service Type: ${formatServiceType(formData.service_type)}`);
    messageParts.push(`- Desired Cleaning Date: ${formData.clean_date || 'Not specified'}`);
    messageParts.push(`- Date Flexible: ${formData.is_flexible || 'Not specified'}`);
    
    // Special requirements
    if (formData.requirements) {
        messageParts.push('\nSpecial Requirements:');
        messageParts.push(formData.requirements);
    }
    
    // Source
    messageParts.push(`\nHow they found us: ${formData.source || 'Not specified'}`);
    
    return messageParts.join('\n');
}

/**
 * Insert booking request into database
 */
async function insertBookingRequest(formData) {
    let connection;
    
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        
        const query = `
            INSERT INTO BookingRequest 
            (full_name, email, phone, address, service_id, message, request_date, status)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), 'Pending')
        `;
        
        const values = [
            formData.full_name,
            formData.email,
            formData.phone_number,
            formData.city,
            getServiceId(formData.service_type),
            buildMessage(formData)
        ];
        
        const [result] = await connection.execute(query, values);
        
        return { success: true, requestId: result.insertId };
        
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

/**
 * Send HTTP headers
 */
function sendHeaders(contentType = 'text/html') {
    console.log(`Content-Type: ${contentType}; charset=utf-8`);
    console.log('');
}

/**
 * Send success HTML response
 */
function sendSuccessResponse(requestId) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Request Submitted - Babcock Cleaning</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #2AA1EB 0%, #1565c0 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .success-container {
            background: white;
            padding: 50px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            text-align: center;
            animation: slideUp 0.5s ease;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .success-icon {
            width: 80px;
            height: 80px;
            background: #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            font-size: 40px;
            color: white;
            animation: scaleIn 0.5s ease 0.2s both;
        }
        
        @keyframes scaleIn {
            from {
                transform: scale(0);
            }
            to {
                transform: scale(1);
            }
        }
        
        h1 {
            color: #2AA1EB;
            margin-bottom: 20px;
            font-size: 2rem;
        }
        
        p {
            color: #666;
            line-height: 1.8;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        
        .request-id {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 25px 0;
            font-weight: 600;
            color: #2AA1EB;
            font-size: 1.2rem;
        }
        
        .btn {
            display: inline-block;
            background: #2AA1EB;
            color: white;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            margin-top: 25px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: #1565c0;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(42, 161, 235, 0.4);
        }
        
        .info-box {
            background: #E3F2FD;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
            text-align: left;
        }
        
        .info-box h3 {
            color: #2AA1EB;
            margin-bottom: 10px;
        }
        
        .info-box ul {
            list-style: none;
            padding-left: 0;
        }
        
        .info-box li {
            padding: 8px 0;
            color: #555;
        }
        
        .info-box li:before {
            content: "✓ ";
            color: #4CAF50;
            font-weight: bold;
            margin-right: 8px;
        }
        
        @media (max-width: 600px) {
            .success-container {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 1.5rem;
            }
            
            p {
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">✓</div>
        <h1>Request Submitted Successfully!</h1>
        <p>Thank you for choosing Babcock Cleaning. We've received your booking request.</p>
        
        <div class="request-id">
            Your Request ID: #${requestId}
        </div>
        
        <p>Our team will review your request and contact you within 24 hours to confirm your booking and provide a detailed quote.</p>
        
        <div class="info-box">
            <h3>What Happens Next?</h3>
            <ul>
                <li>We'll review your property details and requirements</li>
                <li>Calculate a personalized quote for your service</li>
                <li>Contact you via phone or email to confirm details</li>
                <li>Schedule your cleaning appointment</li>
            </ul>
        </div>
        
        <a href="http://localhost/index.html" class="btn">Return to Homepage</a>
        
        <p style="margin-top: 30px; font-size: 0.9rem;">
            Questions? Contact us at <br>
            <strong>contact@babcockcleaning.com</strong> or <strong>(+234) 90 342 4893</strong>
        </p>
    </div>
</body>
</html>`;
    
    console.log(html);
}

/**
 * Send error HTML response
 */
function sendErrorResponse(errors) {
    const errorList = errors.map(error => `• ${error}`).join('<br>');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - Babcock Cleaning</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #f44336 0%, #c62828 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .error-container {
            background: white;
            padding: 50px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            text-align: center;
            animation: slideUp 0.5s ease;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .error-icon {
            width: 80px;
            height: 80px;
            background: #f44336;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            font-size: 40px;
            color: white;
        }
        
        h1 {
            color: #f44336;
            margin-bottom: 20px;
        }
        
        .error-list {
            background: #ffebee;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
            color: #c62828;
            line-height: 1.8;
        }
        
        .btn {
            display: inline-block;
            background: #2AA1EB;
            color: white;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            margin-top: 20px;
            font-weight: 600;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
            font-size: 1rem;
        }
        
        .btn:hover {
            background: #1565c0;
            transform: translateY(-2px);
        }
        
        @media (max-width: 600px) {
            .error-container {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">✕</div>
        <h1>Submission Error</h1>
        <p>We encountered some issues processing your request:</p>
        
        <div class="error-list">
            ${errorList}
        </div>
        
        <p>Please go back and correct these errors.</p>
        
        <button onclick="history.back()" class="btn">Go Back</button>
    </div>
</body>
</html>`;
    
    console.log(html);
}

/**
 * Main handler function
 */
async function main() {
    try {
        // Send HTTP headers
        sendHeaders();
        
        // Parse POST data
        const formData = await parsePostData();
        
        // Validate form data
        const validationErrors = validateFormData(formData);
        
        if (validationErrors.length > 0) {
            sendErrorResponse(validationErrors);
            return;
        }
        
        // Insert into database
        const result = await insertBookingRequest(formData);
        
        if (result.success) {
            sendSuccessResponse(result.requestId);
        } else {
            sendErrorResponse([`Database error: ${result.error}`]);
        }
        
    } catch (error) {
        sendErrorResponse([`System error: ${error.message}`]);
    }
}

// Run the CGI script
main();