import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import LegacyButton from '../LegacyButton';
import Icon from '../Icon';
import Typography from '../Typography';
import InputGroup from '../InputGroup';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import { TextField, Button } from '@mui/material';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('http://app:8080');

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const StudyListFilter = ({
  filtersMeta,
  filterValues,
  onChange,
  clearFilters,
  isFiltering,
  numOfStudies,
  onUploadClick,
  getDataSourceConfigurationComponent,
}) => {
  const { t } = useTranslation('StudyList');
  const { sortBy, sortDirection } = filterValues;
  const filterSorting = { sortBy, sortDirection };

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [me, setMe] = React.useState('');
  const [stream, setStream] = React.useState(null);
  const [screenStream, setScreenStream] = React.useState(null);
  const [recievingCall, setRecievingCall] = React.useState(false);
  const [caller, setCalleer] = React.useState();
  const [callerSignal, setCalleerSignal] = React.useState();
  const [callAccepted, setCallAccepted] = React.useState(false);
  const [idToCall, setIdToCall] = React.useState('');
  const [callEnded, setCallEnded] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const myVideo = React.useRef(null);
  const userVideo = React.useRef(null);
  const screenVideo = React.useRef(null);
  const sharedVideo = React.useRef(null);
  const connectionRef = React.useRef(null);
  const screenShareBtn = React.useRef(null);
  const chatDisplay = React.useRef(null);

  const setFilterSorting = sortingValues => {
    onChange({
      ...filterValues,
      ...sortingValues,
    });
  };
  const isSortingEnabled = numOfStudies > 0 && numOfStudies <= 100;

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then(stream => {
        setStream(stream);
        myVideo.current.srcObject = stream;

        socket.on('me', id => {
          console.log(id);
          setMe(id);
        });

        socket.on('calling', data => {
          setRecievingCall(true);
          setCalleer(data.from);
          setCalleerSignal(data.signal);
        });
      });

    screenShareBtn.current.addEventListener('click', () => {
      navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
        setScreenStream(stream);
        screenVideo.current.srcObject = stream;
      });
    });
  }, []);

  const startScreenSharing = () => {
    navigator.mediaDevices
      .getDisplayMedia({ video: true })
      .then(s => {
        setScreenStream(s);
        socket.emit('screen-sharing', caller);
        connectionRef.current.replaceTrack(
          stream.getVideoTracks()[0],
          s.getVideoTracks()[0],
          stream
        );
      })
      .catch(error => {
        console.error('Error accessing screen:', error);
        alert('Error accessing screen: ' + error);
      });
  };

  const callUser = id => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', data => {
      socket.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on('stream', stream => {
      userVideo.current.srcObject = stream;
    });

    socket.on('callAccepted', signal => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', data => {
      socket.emit('answerCall', { signal: data, to: caller });
    });

    peer.on('stream', stream => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);

    socket.on('screen-sharing', stream => {
      sharedVideo.current.srcObject = stream;
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  const handleConnect = () => {
    handleClose();
    callUser(idToCall);
  };

  const sendMessage = () => {
    const messageText = message.trim(); // Get input value and remove whitespace

    if (messageText !== '') {
      // Check if message is not empty
      const messageContainer = document.createElement('div');
      messageContainer.classList.add('message-container');
      messageContainer.style.display = 'flex';
      messageContainer.style.flexDirection = 'column';
      messageContainer.style.alignItems = 'flex-end';
      messageContainer.style.marginBottom = '10px';

      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message', 'sender');
      messageDiv.style.display = 'inline-block';
      messageDiv.style.padding = '10px 15px';
      messageDiv.style.borderRadius = '20px';
      messageDiv.style.fontSize = '16px';
      messageDiv.style.wordWrap = 'break-word';
      messageDiv.style.marginBottom = '5px';
      messageDiv.style.backgroundColor = '#0084ff';
      messageDiv.style.color = '#fff';
      messageDiv.style.alignSelf = 'flex-end';

      const messageTextDiv = document.createElement('div');
      messageTextDiv.classList.add('message-text');
      messageTextDiv.textContent = messageText;

      messageDiv.appendChild(messageTextDiv);
      messageContainer.appendChild(messageDiv);

      chatDisplay.current.appendChild(messageContainer); // Append message to chat display
      setMessage('');
      chatDisplay.current.scrollTop = chatDisplay.current.scrollHeight; // Scroll to bottom of chat display
    }
  };

  return (
    <React.Fragment>
      <div>
        <div className="bg-black">
          <div className="container relative mx-auto flex flex-col pt-5">
            ``
            <div className="mb-5 flex flex-row justify-between">
              <div className="flex min-w-[1px] shrink flex-row items-center gap-6">
                <Typography
                  variant="h6"
                  className="text-white"
                >
                  {t('StudyList')}
                </Typography>

                <Typography
                  variant="h6"
                  className="text-white"
                >
                  {me ? `ID: ${me}` : 'Connecting to server...'}
                </Typography>
                {getDataSourceConfigurationComponent && getDataSourceConfigurationComponent()}
                {onUploadClick && (
                  <div
                    className="text-primary-active flex cursor-pointer items-center gap-2 self-center text-lg font-semibold"
                    onClick={onUploadClick}
                  >
                    <Icon name="icon-upload"></Icon>
                    <span>{t('Upload')}</span>
                  </div>
                )}
              </div>
              <div className="flex h-[34px] flex-row items-center">
                {/* TODO revisit the completely rounded style of button used for clearing the study list filter - for now use LegacyButton*/}
                {isFiltering && (
                  <LegacyButton
                    rounded="full"
                    variant="outlined"
                    color="primaryActive"
                    border="primaryActive"
                    className="mx-8"
                    startIcon={<Icon name="cancel" />}
                    onClick={clearFilters}
                  >
                    {t('ClearFilters')}
                  </LegacyButton>
                )}
                <Typography
                  variant="h6"
                  className="text-primary-light"
                >
                  {`${t('Number of studies')}: `}
                </Typography>
                <Typography
                  variant="h6"
                  className="mr-2"
                  data-cy={'num-studies'}
                >
                  {numOfStudies > 100 ? '>100' : numOfStudies}
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="sticky -top-1 z-10 mx-auto border-b-4 border-black">
        <div className="bg-primary-dark pt-3 pb-3">
          <InputGroup
            inputMeta={filtersMeta}
            values={filterValues}
            onValuesChange={onChange}
            sorting={filterSorting}
            onSortingChange={setFilterSorting}
            isSortingEnabled={isSortingEnabled}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: '15px',
            }}
          >
            <button
              style={{
                paddingTop: '10px',
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                padding: '10px 20px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                marginRight: '10px',
              }}
              onClick={handleOpen}
            >
              {t('Consultate via video or chat')}
            </button>
            <button
              ref={screenShareBtn}
              onClick={startScreenSharing}
              style={{
                paddingTop: '10px',
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                padding: '10px 20px',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
              }}
            >
              Start ScreenSharing
            </button>
          </div>
        </div>
        {numOfStudies > 100 && (
          <div className="container m-auto">
            <div className="bg-primary-main rounded-b py-1 text-center text-base">
              <p className="text-white">
                {t('Filter list to 100 studies or less to enable sorting')}
              </p>
            </div>
          </div>
        )}
        <Modal
          open={open}
          onClose={handleClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box sx={style}>
            <Typography
              variant="h6"
              component="h2"
              color="#15007F"
            >
              Enter details for connection to consultation
            </Typography>
            <TextField
              id="pin"
              value={idToCall}
              onChange={e => setIdToCall(e.target.value)}
              label="Enter PIN"
              variant="outlined"
              color="primary"
              sx={{ mt: 2, width: '100%' }}
            />
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 2, backgroundColor: '#15007F', color: 'white' }}
              onClick={handleConnect}
            >
              Call user
            </Button>
          </Box>
        </Modal>
        <div style={{ height: '350px', overflow: 'scroll' }}>
          <div
            id="video-grid"
            className="flex w-full"
          >
            <div className="video w-3/12">
              {stream && (
                <video
                  playsInline
                  muted
                  ref={myVideo}
                  autoPlay
                />
              )}
            </div>
            <div className="video w-3/12">
              {callAccepted && !callEnded ? (
                <video
                  playsInline
                  ref={userVideo}
                  autoPlay
                />
              ) : null}
            </div>
            {/* <div className="video w-6/12 bg-white">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  backgroundColor: '#fff',
                  borderLeft: '1px solid #ddd',
                }}
              >
                <div
                  ref={chatDisplay}
                  style={{
                    flex: '1',
                    overflowY: 'auto',
                    padding: '10px',
                  }}
                ></div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={message}
                    style={{
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '25px',
                      marginTop: '10px',
                      resize: 'none',
                      fontSize: '16px',
                      flex: '1',
                    }}
                    placeholder="Type a message..."
                    onChange={val => setMessage(val.target.value)}
                  />
                  <button
                    style={{
                      padding: '10px',
                      backgroundColor: '#0084ff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '20px',
                      marginLeft: '10px',
                    }}
                    onClick={sendMessage}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div> */}
          </div>
          <div className="flex">
            <div className="video w-6/12">
              {screenStream && (
                <video
                  playsInline
                  muted
                  ref={screenVideo}
                  autoPlay
                />
              )}
            </div>
          </div>
        </div>
        <div className="buttons">
          {recievingCall && !callAccepted ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 2, backgroundColor: '#bada55', color: 'white' }}
              onClick={answerCall}
            >
              Answer
            </Button>
          ) : null}
          {callAccepted && !callEnded ? (
            <Button
              onClick={leaveCall}
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 2, backgroundColor: '#bada55', color: 'white' }}
            >
              End Call
            </Button>
          ) : null}
        </div>
      </div>
    </React.Fragment>
  );
};

StudyListFilter.propTypes = {
  filtersMeta: PropTypes.arrayOf(
    PropTypes.shape({
      /** Identifier used to map a field to it's value in `filterValues` */
      name: PropTypes.string.isRequired,
      /** Friendly label for filter field */
      displayName: PropTypes.string.isRequired,
      /** One of the supported filter field input types */
      inputType: PropTypes.oneOf(['Text', 'MultiSelect', 'DateRange', 'None']).isRequired,
      isSortable: PropTypes.bool.isRequired,
      /** Size of filter field in a 12-grid system */
      gridCol: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).isRequired,
      /** Options for a "MultiSelect" inputType */
      option: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string,
          label: PropTypes.string,
        })
      ),
    })
  ).isRequired,
  filterValues: PropTypes.object.isRequired,
  numOfStudies: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  isFiltering: PropTypes.bool.isRequired,
  onUploadClick: PropTypes.func,
  getDataSourceConfigurationComponent: PropTypes.func,
};

export default StudyListFilter;
