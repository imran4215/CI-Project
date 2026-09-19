#include <SoftwareSerial.h>

/**
 * DigiHall AI - RFID Candidate ID Card Reader Firmware
 * 
 * Hardware Setup:
 * - EM-18 / RDM6300 125kHz RFID Reader (or RC522 SPI / UART module)
 * - RX Pin: Arduino Pin 10 (Connected to RFID TX)
 * - TX Pin: Arduino Pin 11 (Unused / optional)
 * - Baud Rate: 9600
 * 
 * Emits output format: "ATTENDANCE:<10-DIGIT-DECIMAL-TAG>"
 */

const int BUFFER_SIZE = 14;
const int DATA_TAG_SIZE = 8;

SoftwareSerial ssrfid(10, 11); // RX, TX (TX unused)
uint8_t buffer[BUFFER_SIZE];
int buffer_index = 0;

String lastTag = "";
unsigned long lastScanMs = 0;

void setup()
{
    Serial.begin(9600);
    ssrfid.begin(9600);
    ssrfid.listen();
    Serial.println("DigiHall AI RFID Reader Ready (Baud 9600)");
}

void loop()
{
    if (ssrfid.available() <= 0)
    {
        return;
    }

    bool call_extract_tag = false;
    int ssvalue = ssrfid.read();

    if (ssvalue == -1)
    {
        return;
    }

    if (ssvalue == 2)
    {
        buffer_index = 0;
    }
    else if (ssvalue == 3)
    {
        call_extract_tag = true;
    }

    if (buffer_index >= BUFFER_SIZE)
    {
        Serial.println("Error: Buffer overflow");
        buffer_index = 0;
        return;
    }

    buffer[buffer_index++] = ssvalue;

    if (call_extract_tag && buffer_index == BUFFER_SIZE)
    {
        extract_tag();
        buffer_index = 0;
    }
    else if (call_extract_tag)
    {
        buffer_index = 0;
    }
}

void extract_tag()
{
    char hexTag[DATA_TAG_SIZE + 1];
    for (int i = 0; i < DATA_TAG_SIZE; i++)
    {
        hexTag[i] = buffer[i + 3];
    }
    hexTag[DATA_TAG_SIZE] = '\0';

    long tagDec = strtol(hexTag, NULL, 16);
    char tagStr[11];
    sprintf(tagStr, "%010ld", tagDec);

    String tag = String(tagStr);
    unsigned long nowMs = millis();

    // Prevent repeated spam when card stays placed on reader.
    if (tag == lastTag && (nowMs - lastScanMs) < 1200)
    {
        return;
    }

    Serial.print("ATTENDANCE:");
    Serial.println(tag);

    lastTag = tag;
    lastScanMs = nowMs;
}
