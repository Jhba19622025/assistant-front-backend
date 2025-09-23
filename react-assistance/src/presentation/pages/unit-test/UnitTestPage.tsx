import { useEffect, useState } from 'react';
import { GptMessage, MyMessage, TypingLoader, TextMessageBox } from '../../components';
import { createThreadUseCase, PostQuestionUtUseCase } from '../../../core/use-cases';

interface Message {
  text: string;
  isGpt: boolean;
}


export const UnitTestPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const [threadId, setThreadId] = useState<string>();

  // Obtener el thread, y si no existe, crearlo
  useEffect(() => {
    const threadId = localStorage.getItem('threadId');
    if (threadId) {
      setThreadId(threadId);
    } else {
      createThreadUseCase()
        .then((id) => {
          setThreadId(id);
          localStorage.setItem('threadId', id)
        })
    }
  }, []);




  const handleUtPost = async (text: string) => {

    if (!threadId) return;

    setIsLoading(true);
    setMessages((prev) => [...prev, { text: text, isGpt: false }]);


    const replies = await PostQuestionUtUseCase(threadId, text)

    setIsLoading(false);

    for (const reply of replies) {
      for (const message of reply.content) {
        setMessages((prev) => [
          ...prev,
          { text: message, isGpt: (reply.role === 'assistant'), info: reply }
        ])
      }
    }
  }
  return (
    <div className="chat-container">
      <div className="chat-messages">
        <div className="grid grid-cols-12 gap-y-2">
          {/* Bienvenida */}
          <GptMessage text="Buen día, soy jhba - Unit Test, ¿Cuál es tu nombre? y ¿en qué puedo ayudarte?" />

          {
            messages.map((message, index) => (
              message.isGpt
                ? (
                  <GptMessage key={index} text={message.text} />
                )
                : (
                  <MyMessage key={index} text={message.text} />
                )

            ))
          }


          {
            isLoading && (
              <div className="col-start-1 col-end-12 fade-in">
                <TypingLoader />
              </div>
            )
          }


        </div>
      </div>


      <TextMessageBox
        onSendMessage={handleUtPost}
        placeholder='Escribe aquí lo que deseas'
        disableCorrections
      />

    </div>

  );
};
