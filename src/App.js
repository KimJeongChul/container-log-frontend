import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import './App.css';

const App = () => {
    // containers
    const [containers, setContainers] = useState([]);
    const [selectedContainer, setSelectedContainer] = useState(null);
    const currentContainerRef = useRef(null);
    const [currentContainer, setCurrentContainer] = useState(null);

    // logs 
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);
    const logsContainerRef = useRef(null);

    // Websocket
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const socketRef = useRef(null);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;
    let ws;

    useEffect(() => {
        const fetchContainers = async () => {
            try {
                const response = await axios.get("http://localhost:8080/api/v1/containers");
                setContainers(response.data);
            } catch (error) {
                console.error("Error fetching containers:", error);
            }
        };

        fetchContainers();
    }, []);

    const createWebSocket = (containerId, containerName) => {
        ws = new WebSocket(`ws://localhost:8080/api/v1/logs/${containerId}`);

        ws.onopen = () => {
          console.log("WebSocket connection opened");
          setReconnectAttempts(0); // Initalize reconnect attempts
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            typeLog(data.msg);
            ws.send(event.data);
        };

        ws.onclose = () => {
            if (currentContainerRef.current === containerId) {
                handleReconnect(containerId, containerName); // 재연결 시도
            } else {
                console.log("WebSocket closed for a different container. No reconnection attempt.");
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            ws.close()
        };

        return ws;
    };

    const handleReconnect = (containerId, containerName) => {
		if (reconnectAttempts < maxReconnectAttempts) {
			setTimeout(() => {
				console.log(`Reconnecting... Attempt: ${reconnectAttempts + 1}`);
				setReconnectAttempts((prev) => prev + 1);
				connectWebsocket(containerId, containerName); // Retry
			}, reconnectDelay);
		} else {
			console.log("Max reconnect attempts reached. Stopping reconnection attempts.");
		}
    };

    // Connect Websocket
    const connectWebsocket = (containerId, containerName) => {
		if (containerId !== currentContainerRef.current) {
			setLogs([]); // Remove previous log
		}
		setSelectedContainer(containerName);
		setCurrentContainer({ id: containerId, name: containerName });
		currentContainerRef.current = containerId;
    };

    const typeLog = (newLog) => {
        const typingSpeed = 100;
        setTimeout(() => {
        	setLogs((prevLogs) => [...prevLogs, newLog])
        }, typingSpeed);
    };

    // Check for scroll to bottom
    const isScrolledToBottom = () => {
		const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
		return scrollHeight - scrollTop === clientHeight;
    };
    
    // Down to scroll automatic
    useEffect(() => {
      if (isScrolledToBottom()) {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, [logs]);

    useEffect(() => {
      if (currentContainer !== null) {
          // Close web socket
          if (socketRef.current) {
              console.log("Closing previous WebSocket connection");
              socketRef.current.close();
          }

          // Create new websocket
          socketRef.current = createWebSocket(currentContainer.id, currentContainer.name);

          return () => {
              if (socketRef.current) {
                  console.log("Cleaning up WebSocket connection");
                  socketRef.current.close();
              }
          };
      }
    }, [currentContainer]);


    return (
        <div style={{ display: "flex" }}>
            <aside style={{ width: "300px", padding: "10px", borderRight: "1px solid #ccc", position: "fixed", height: "100vh", overflowY: "auto"}}>
                <h2>Containers</h2>
                <ul>
                    {containers.map((container) => (
                        <li key={container.id} onClick={() => connectWebsocket(container.id, container.name)}>
                            {container.name.substring(0, 20)} (ID: {container.id.substring(0, 8)})
                        </li>
                    ))}
                </ul>
            </aside>
            <main style={{ padding: "10px",  marginLeft: "320px", flex: 1 }}>
                <h2>Logs for Container: {selectedContainer ? selectedContainer : "None"}</h2>
                <div ref={logsContainerRef} style={styles.logContainer}>
                  {logs.map((log, index) => (
                    <span> <br /> {log}</span>
                  ))}
                  <div className="blinking-cursor">👈🏻</div> {/* Blinking curosr*/}
                  <div ref={logsEndRef} />  {/* Reference to scroll cursor */}
                  
                </div>
            </main>
        </div>
    );
};

const styles = {
	logContainer: {
		logContainer: {
			position: "relative",
			height: "600px",
			overflowY: "auto",
			backgroundColor: "#1e1e1e",
			color: "#dcdcdc",
			padding: "10px",
			fontSize: "medium",
			fontFamily: "'Courier New', Courier, monospace",
			borderRadius: "5px",
			boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)"
		},
		logEntry: {
			whiteSpace: "pre-wrap",
			marginBottom: "1px",
		}
	}
}

export default App;
