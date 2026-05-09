from flask import Blueprint, request, jsonify, send_file
import logging
from io import BytesIO
import os
from dotenv import load_dotenv

load_dotenv()

voice_bp = Blueprint("voice", __name__)

logger = logging.getLogger(__name__)

# Try to use Google Cloud TTS, fallback to pyttsx3
try:
    from google.cloud import texttospeech
    GOOGLE_TTS_AVAILABLE = True
except ImportError:
    GOOGLE_TTS_AVAILABLE = False
    logger.warning("Google Cloud TTS not available, attempting pyttsx3")
    try:
        import pyttsx3
        PYTTSX3_AVAILABLE = True
    except ImportError:
        PYTTSX3_AVAILABLE = False
        logger.warning("pyttsx3 not available either")

# Language code mapping
LANG_CODE_MAP = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'bn': 'bn-IN',
    'mr': 'mr-IN',
    'gu': 'gu-IN',
    'pa': 'pa-IN',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'ru': 'ru-RU',
    'zh': 'zh-CN',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
}

@voice_bp.route("/test", methods=["GET"])
def test_voice():
    return {"voice": "ok"}

@voice_bp.route("/speak", methods=["POST"])
def speak_text():
    try:
        data = request.get_json()
        text = data.get("text", "")
        language = data.get("language", "en")

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Get proper language code
        lang_code = LANG_CODE_MAP.get(language, "en-US")

        # Try Google Cloud TTS first
        if GOOGLE_TTS_AVAILABLE:
            audio_data = _speak_with_google_tts(text, lang_code)
        elif PYTTSX3_AVAILABLE:
            audio_data = _speak_with_pyttsx3(text, language)
        else:
            return jsonify({"error": "No TTS engine available"}), 500

        # Return audio as MP3
        return send_file(
            BytesIO(audio_data),
            mimetype="audio/mp3",
            as_attachment=True,
            download_name="speech.mp3"
        )

    except Exception as e:
        logger.error(f"TTS error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def _speak_with_google_tts(text, lang_code):
    """Synthesize speech using Google Cloud Text-to-Speech API"""
    try:
        client = texttospeech.TextToSpeechClient()

        input_text = texttospeech.SynthesisInput(text=text)

        voice = texttospeech.VoiceSelectionParams(
            language_code=lang_code,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = client.synthesize_speech(
            request={"input": input_text, "voice": voice, "audio_config": audio_config}
        )

        return response.audio_content
    except Exception as e:
        logger.error(f"Google TTS failed: {e}")
        raise

def _speak_with_pyttsx3(text, language):
    """Fallback: Synthesize speech using pyttsx3"""
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)

        # Save to temporary file
        output_path = "/tmp/speech.mp3"
        engine.save_to_file(text, output_path)
        engine.runAndWait()

        # Read and return the file
        with open(output_path, 'rb') as f:
            return f.read()
    except Exception as e:
        logger.error(f"pyttsx3 failed: {e}")
        raise

@voice_bp.route("/analyze-speech", methods=["POST"])
def analyze_speech():
    """Analyze uploaded audio file"""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']
        target_language = request.form.get('targetLanguage', 'en')

        # Use Google Speech-to-Text API
        from google.cloud import speech_v1

        client = speech_v1.SpeechClient()

        content = audio_file.read()
        audio = speech_v1.RecognitionAudio(content=content)

        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=LANG_CODE_MAP.get(target_language, 'en-US'),
        )

        response = client.recognize(config=config, audio=audio)

        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript

        return jsonify({
            "success": True,
            "transcript": transcript,
            "language": target_language
        }), 200

    except Exception as e:
        logger.error(f"Speech analysis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

